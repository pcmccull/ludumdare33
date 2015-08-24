var _ = require("underscore");
var GameStates = require("./GameStates");
var settings = require("../settings");
var carController = require("../controllers/CarController");
var shopperController = require("../controllers/ShopperController");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  shoppers: [],
  monstersFound: 0,
  monstersEscaped: 0,
  create: function () {
    _.bindAll(this, "checkIfHoverShopper")
    var background = game.add.sprite(0,0, "sprites");
    background.frameName= "backgroundCombined";
    carController.initialize();
    shopperController.initialize();
    this.gameObjectsLayer = game.add.group();
    this.accuseDialog = game.add.sprite(0,0, "sprites");
    this.accuseDialog.frameName = "accuseDialog";
    this.accuseDialog.anchor.x = 0.3;
    this.accuseDialog.visible = false;
    this.accuseDialog.anchor.y = -.2;

    this.monstersFound = 0;
    this.monstersEscaped = 0;
    this.shoppers = [];
    for (var i = 0; i < 5; i++) {
      this.addShopperInStore();
    }
  //  this.addShopper();
    window.Play = this;
    game.input.onDown.add(this.checkIfHitShopper, this);
    game.input.mouse.onMouseMove = this.checkIfHoverShopper;
  },
  update: function () {
    if (Math.random() < 0.005 && this.shoppers.length < settings.spaces) {
      this.addShopper();
    }

  var removeShoppers = [];
    _.each(this.shoppers, _.bind(function (shopper, index) {

      if (!shopper.car.isParked) {
          carController.updateCar(shopper.car);
      } else if (shopper.readyToLeave) {
        if (shopper.person.isMonster) {
          this.monstersEscaped ++;
        }
        carController.startLeaving(shopper.car);
      } else {
        this.updateShopper(shopper);
      }

      if (shopper.car.readyToBeDestroyed === true) {

        removeShoppers.push(index);
      }

    }, this));
    for ( var i = removeShoppers.length -1; i >= 0; i--) {
      console.log("shopper removed");

      this.shoppers[removeShoppers[i]].car.destroy();
      this.shoppers[removeShoppers[i]].person.destroy();
      this.shoppers.splice(removeShoppers[i], 1);

    }
  },
  render: function () {
    //game.debug.text(game.time.fps || "--", 2, 14, "#a7aebe");
    game.debug.text("Monsters found: " + this.monstersFound , 560, 24, "#FFFAD5");
    game.debug.text("Monsters escaped: " + this.monstersEscaped , 560, 40, "#FFFAD5");
  },
  updateShopper: function (shopper) {
    shopper.stateUpdate(shopper);
  },
  addShopper: function () {
    var shopper = this.createShopper(400, 60, -Math.PI/2);
    var car = carController.addCar(this.gameObjectsLayer);
    carController.placeAtEntrance(car);
    shopper.stateUpdate = shopperController.stateGetOutOfCar;

    shopper.car = car;
    collisionController.add(car);
    this.shoppers.push(shopper);
    return shopper;
  },
  addShopperInStore: function () {
    var shopper = this.addShopper();
    carController.parkCarInOpenSpace(shopper.car);
    shopper.stateUpdate = shopperController.stateEnteredStore;
  },

  createShopper: function (x, y, rotation) {
      var person = this.gameObjectsLayer.create(0,0, "sprites");
      person.frameName = "person" + (Math.floor(Math.random() * 3) + 1);
      person.anchor.x = 0;
      person.anchor.y = 0.5;
      person.scale.set(1.5, 1.5);
      person.visible = false;
      person.objectType = "person";
      person.hitArea = new Phaser.Rectangle(0, 0, 80, 80);
      person.getBounds = function () {
        return {
          top: this.top - settings.personSpace,
          bottom: this.bottom + settings.personSpace,
          left: this.left + settings.personSpace,
          right: this.right - settings.personSpace,
        };
      };
      collisionController.add(person);

      person.isMonster = Math.random() < .6;
      if (person.isMonster) {
        person.monsterType = shopperController.monsterTypes[Math.floor(Math.random() *shopperController.monsterTypes.length)]
      }

      var cart = this.gameObjectsLayer.create(0,0, "sprites");
      cart.frameName = "cart";
      cart.anchor.x = 1;
      cart.anchor.y = 0.5;
      cart.scale.set(1.2, 1.2);
      cart.visible = false;
      cart.objectType = "cart";
      cart.getBounds = function () {
        return {
          top: this.top - settings.cartSpace,
          bottom: this.bottom + settings.cartSpace,
          left: this.left + settings.cartSpace,
          right: this.right - settings.cartSpace,
        };
      };
      collisionController.add(cart);

      var shopper = {
        person: person,
        cart: cart,
        entranceTime: +new Date,
        shoppingTime: 2000 + Math.random() * 10000
      }
      this.moveShopper(shopper, x, y, rotation);
      person.shopper = shopper;
      return shopper;
  },
  checkIfHitShopper: function (evt) {
    var clickX = evt.position.x;
    var clickY = evt.position.y;
    _.each(this.shoppers, _.bind(function (shopper) {
      var x = shopper.person.x;
      var y = shopper.person.y;
      var dx = x - clickX;
      var dy = y - clickY;
      if (dx*dx + dy*dy < 1000) {
        this.accuseMonster(shopper.person);
      }
    }, this));
  },
  checkIfHoverShopper:  function (evt) {
    var clickX = evt.layerX;
    var clickY = evt.layerY;
    this.accuseDialog.visible = false;
    _.each(this.shoppers, _.bind(function (shopper) {
      var x = shopper.person.x;
      var y = shopper.person.y;
      var dx = x - clickX;
      var dy = y - clickY;
      if (dx*dx + dy*dy < 1000) {
        this.accuseDialog.visible = true;
        this.accuseDialog.x = shopper.person.x;
        this.accuseDialog.y = shopper.person.y;
      }
    }, this));
  },
  accuseMonster: function (person) {
    if (person.isMonster) {
      console.log("You found one!", person.monsterType );
      this.monstersFound ++;
      person.visible = false;
      person.shopper.cart.visible = false;
      person.shopper.car.visible = false;
      person.shopper.car.readyToBeDestroyed = true;
      person.shopper.car.spaceTarget.available = true;
      this.accuseDialog.visible = false;
    } else {
      window.monstersEscaped = this.monstersEscaped;
      window.monstersFound = this.monstersFound;
      game.state.start(GameStates.gameOver);
      console.log("You accused an innnocent person!");
    }
  },
  moveShopper: function (shopper, x, y, rotation) {
    shopper.person.position.x = x;
    shopper.person.position.y = y;
    shopper.person.rotation = rotation;
    shopper.cart.position.x = x;
    shopper.cart.position.y = y;
    shopper.cart.rotation = rotation;
  },
};
