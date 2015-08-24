var _ = require("underscore");
var GameStates = require("./GameStates");
var settings = require("../settings");
var carController = require("../controllers/CarController");
var shopperController = require("../controllers/ShopperController");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  shoppers: [],
  create: function () {
    var background = game.add.sprite(0,0, "sprites");
    background.frameName= "backgroundCombined";
    carController.initialize();
    shopperController.initialize();
    this.shoppers = [];
    for (var i = 0; i < 5; i++) {
      this.addShopperInStore();
    }
    this.addShopper();
    window.Play = this;
    game.input.onDown.add(this.addShopper, this);
  },
  update: function () {
    // if (Math.random() < 0.1 && this.shoppers.length < settings.spaces) {
    //   this.addShopper();
    // }

  var removeShoppers = [];
    _.each(this.shoppers, _.bind(function (shopper, index) {

      if (!shopper.car.isParked) {
          carController.updateCar(shopper.car);
      } else if (shopper.readyToLeave) {
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
    game.debug.text(game.time.fps || "--", 2, 14, "#a7aebe");
  },
  updateShopper: function (shopper) {
    shopper.stateUpdate(shopper);
  },
  addShopper: function () {
    var shopper = this.createShopper(400, 60, -Math.PI/2);
    var car = carController.addCar();
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
      var person = game.add.sprite(0,0, "sprites");
      person.frameName = "person" + (Math.floor(Math.random() * 3) + 1);
      person.anchor.x = 0;
      person.anchor.y = 0.5;
      person.scale.set(1.5, 1.5);
      person.visible = false;
      person.objectType = "person";
      person.getBounds = function () {
        return {
          top: this.top - settings.personSpace,
          bottom: this.bottom + settings.personSpace,
          left: this.left + settings.personSpace,
          right: this.right - settings.personSpace,
        };
      };
      collisionController.add(person);

      var cart = game.add.sprite(0,0, "sprites");
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

      return shopper;
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
