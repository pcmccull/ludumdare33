var settings = require("../settings");
var _ = require("underscore");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  initialize: function () {
    _.bindAll(this,
      "stateGetOutOfCar",
      "stateEnteredStore",
      "stateWalkToColumn",
      "stateWalkToColumnTop",
      "stateWalkToCrossWalk",
      "stateWalkIntoStore",
      "stateFinishShopping",
      "stateWalkDownCrosswalk",
      "stateWalkBackToColumn",
      "stateWalkDownToCar",
      "stateUnloadGroceries",
      "stateReturnCart",
      "stateReturnCartColumn",
      "stateReturnCartRow",
      "stateReturnCartIntoReturnArea",
      "stateLeavingReturnToCarX",
      "stateLeavingWalkToCarDoor"
    );
  },
  stateGetOutOfCar: function (shopper) {

    shopper.person.visible = true;
    if (shopper.car.spaceTarget.column % 2 === 0) {
      shopper.person.x = shopper.car.x ;
      shopper.person.y = shopper.car.y + 30;
      shopper.person.rotation = settings.personDown
      shopper.nextTargetX = shopper.car.x + 60;
    } else {
      shopper.person.x = shopper.car.x ;
      shopper.person.y = shopper.car.y - 30;
      shopper.person.rotation = settings.personUp
      shopper.nextTargetX = shopper.car.x - 60;
    }
    shopper.stateUpdate = this.stateWalkToColumn;
  },
  stateEnteredStore: function (shopper) {
    shopper.person.visible = false;
    shopper.cart.visible = false;

    shopper.shoppingTime = (+new Date) + 10000 * Math.random();
    shopper.stateUpdate = this.stateFinishShopping;
  },
  stateFinishShopping: function (shopper) {
    if ((+ new Date) > shopper.shoppingTime) {
      shopper.cart.visible = true;
      shopper.cart.frameName ="cartFull";
      shopper.person.visible = true;
      this.moveCartAndPerson(shopper, shopper.person.x, 80, settings.personDown);
      shopper.stateUpdate = this.stateWalkDownCrosswalk;
    }
  },
  stateWalkDownCrosswalk: function (shopper) {
    var dy = shopper.person.y - settings.lotTop;
    if (Math.abs(dy) < 1) {
      shopper.stateUpdate = this.stateWalkBackToColumn;
    } else {
      if (shopper.car.spaceTarget.column % 2 === 0) {
        shopper.nextTargetX = shopper.car.x + 60;
      } else {
        shopper.nextTargetX = shopper.car.x - 60;
      }
      this.moveCartAndPerson(shopper, shopper.person.x, shopper.person.y + settings.walkSpeed, settings.personDown);
    }
  },
  stateWalkBackToColumn: function (shopper) {
    var dx = shopper.person.x - shopper.nextTargetX;
    if (Math.abs(dx) < 1) {
      shopper.stateUpdate = this.stateWalkDownToCar;
    } else if (dx > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x - settings.walkSpeed,
        shopper.person.y,
        settings.personLeft);
    } else if (dx < 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed,
        shopper.person.y,
        settings.personRight);
    }
  },
  stateWalkDownToCar: function (shopper) {
    var dy = shopper.person.y - shopper.car.y;
    if (Math.abs(dy) < 1) {
      shopper.unloadCounter = 0;
      shopper.maxUnloadCounter = Math.random() * 100 + 100;
      shopper.stateUpdate = this.stateUnloadGroceries;
      if (shopper.car.x - shopper.person.x < 0) {
        shopper.person.x -= 5;
      } else {
        shopper.person.x += 5;
      }
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y + settings.walkSpeed,
        settings.personDown);
    }
  },
  stateUnloadGroceries: function (shopper) {
    shopper.unloadCounter++;
    if (shopper.unloadCounter > shopper.maxUnloadCounter) {
      shopper.stateUpdate = this.stateReturnCart;
      shopper.cart.frameName ="cart";
    } else {
      var direction = settings.personRight;
      if (shopper.car.x - shopper.person.x < 0) {
        direction = settings.personLeft;
      }
      if (shopper.unloadCounter % 20 < 10) {
        shopper.person.rotation = direction;
      } else {
        shopper.person.rotation = settings.personDown;
      }
    }
  },

  stateReturnCart: function (shopper) {
    shopper.stateUpdate = this.stateReturnCartColumn;
  },
  stateReturnCartColumn: function (shopper) {
    shopper.stateUpdate = this.stateReturnCartRow;
  },
  stateReturnCartRow: function (shopper) {
    shopper.stateUpdate = this.stateReturnCartIntoReturnArea;
  },
  stateReturnCartIntoReturnArea: function (shopper) {
    shopper.stateUpdate = this.stateLeavingReturnToCarX;
  },
  stateLeavingReturnToCarX: function (shopper) {
    shopper.stateUpdate = this.stateLeavingWalkToCarDoor;
  },
  stateLeavingWalkToCarDoor: function (shopper) {
    shopper.readyToLeave = true;
    shopper.person.visible = false;
  },
  stateWalkToColumn: function (shopper) {
    var dx = shopper.person.x - shopper.nextTargetX;
    if (Math.abs(dx) < 1) {
      shopper.stateUpdate = this.stateWalkToColumnTop;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }
  },
  stateWalkToColumnTop: function (shopper) {
    var dy = shopper.person.y - settings.lotTop;
    if (Math.abs(dy) < 1) {
      shopper.stateUpdate = this.stateWalkToCrossWalk;
    } else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }
  },
  stateWalkToCrossWalk: function (shopper) {
    var dx = shopper.person.x - 400;
    if (Math.abs(dx) < 1) {
      shopper.stateUpdate = this.stateWalkIntoStore;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }
  },
  stateWalkIntoStore: function (shopper) {
    var dy = shopper.person.y - 80;
    if (Math.abs(dy) < 1) {
      shopper.stateUpdate = this.stateEnteredStore;
    } else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }
  },
  moveCartAndPerson: function (shopper, x, y, rotation) {
    shopper.person.x = x;
    shopper.person.y = y;
    shopper.person.rotation = rotation;

    shopper.cart.x = shopper.person.x;
    shopper.cart.y = shopper.person.y;
    shopper.cart.rotation = shopper.person.rotation;
  }
}
