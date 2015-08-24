var settings = require("../settings");
var _ = require("underscore");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  monsterTypes: [
    "stateLeaveBehindNextCar",
    "statePushBetweenCar"
  ],
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
      "stateLeavingReturnToCarY",
      "stateLeavingWalkToCarDoor",
      "stateLeaveBehindNextCar",
      "statePushBetweenCar",
      "statePushTowardsCartReturn",
      "stateRandomlyPush"
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
    if (Math.abs(dy) < settings.walkSpeed * 2) {
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
    if (Math.abs(dx) < settings.walkSpeed * 2) {
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
    if (Math.abs(dy) < settings.walkSpeed * 2) {
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
    if (shopper.person.isMonster) {
      shopper.stateUpdate = this[shopper.person.monsterType];
    } else {
      shopper.stateUpdate = this.stateReturnCartColumn;
    }
  },
  stateLeaveBehindNextCar: function (shopper) {
    if (shopper.monsterState === undefined) {
      shopper.monsterState = {
        targetY: shopper.person.y - 70
      }
    }
    var dy = shopper.person.y - shopper.monsterState.targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateLeavingReturnToCarY;
      shopper.cart.rotation = Math.random() * Math.PI*2;
      shopper.cart.y += Math.random() * 10 - Math.random() * 5;
      shopper.cart.x += Math.random() * 10 - Math.random() * 5;
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    }

  },
  statePushBetweenCar: function (shopper) {
    if (shopper.monsterState === undefined) {
      shopper.monsterState = {
        targetY: shopper.car.y - 40,
        targetX: (shopper.car.spaceTarget.column % 2 == 0 ?
          shopper.car.x - 70 : shopper.car.x + 70),

      }
    }

    var dy = shopper.person.y - shopper.monsterState.targetY;
    var dx = shopper.person.x - shopper.monsterState.targetX;
    if (Math.abs(dy) <= settings.walkSpeed * 2
      && Math.abs(dx) <= settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateLeavingReturnToCarY;
      shopper.cart.rotation = Math.random() * Math.PI*2;
      shopper.cart.y += Math.random() * 10 - Math.random() * 5;
      shopper.cart.x += Math.random() * 10 - Math.random() * 5;
    } else if (Math.abs(dy) > settings.walkSpeed * 2) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    } else if (Math.abs(dx) > settings.walkSpeed * 2){
      var directionX = dx < 0 ? 1 : -1;
      var rotation= dx < 0 ? settings.personRight : settings.personLeft;
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed * directionX,
        shopper.person.y ,
        rotation);
    }
  },
  statePushTowardsCartReturn: function (shopper) {

  },
  stateRandomlyPush: function (shopper) {
    if (shopper.monsterStateInited === undefined) {
    }
  },
  stateReturnCartColumn: function (shopper) {
    var targetX = shopper.car.spaceTarget.column < 2?
      settings.lot1UpX + 20:
      settings.lot2DownX - 20;

    var dx = shopper.person.x - targetX;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateReturnCartRow;
      shopper.nextTargetY = settings.spaces1Y
      + settings.spaceOffset * 2
        + Math.random() * 30
        - Math.random() * 15;
    } else if (dx > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x - settings.walkSpeed,
        shopper.person.y,
        settings.personLeft);
    } else {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x + settings.walkSpeed,
        shopper.person.y,
        settings.personRight);
    }
  },
  stateReturnCartRow: function (shopper) {
    var targetY = shopper.nextTargetY;

    var dy = shopper.person.y - targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateReturnCartIntoReturnArea;
    } else if (dy > 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y - settings.walkSpeed,
        settings.personUp);
    } else if (dy < 0) {
      this.moveCartAndPerson(
        shopper,
        shopper.person.x,
        shopper.person.y + settings.walkSpeed,
        settings.personDown);
    }
  },
  stateReturnCartIntoReturnArea: function (shopper) {
    if (shopper.car.spaceTarget.column < 2) {
      shopper.cart.rotation = settings.personRight
      + Math.random() * 0.2 - Math.random() * 0.1;
      shopper.cart.x += (10 + Math.random() * 100);
    } else {
      shopper.cart.rotation = settings.personLeft
        + Math.random() * 0.2 - Math.random() * 0.1;
      shopper.cart.x -= (10 + Math.random() * 100);
    }
    shopper.stateUpdate = this.stateLeavingReturnToCarY;
  },
  stateLeavingReturnToCarY: function (shopper) {
    var targetY;
    if (shopper.car.spaceTarget.column % 2 === 0) {
      targetY = shopper.car.y + 30;
    } else {
      targetY = shopper.car.y - 30;
    }

    var dy = shopper.person.y - targetY;
    if (Math.abs(dy) < settings.walkSpeed * 2) {
        shopper.stateUpdate = this.stateLeavingWalkToCarDoor;
    } else if (dy < 0) {
      shopper.person.y += settings.walkSpeed;
      shopper.person.rotation = settings.personDown;
    }else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }

  },
  stateLeavingWalkToCarDoor: function (shopper) {
    var dx = shopper.person.x - shopper.car.x;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
      shopper.readyToLeave = true;
      shopper.person.visible = false;
    } else if (dx > 0) {
      shopper.person.x -= settings.walkSpeed;
      shopper.person.rotation = settings.personLeft;
    } else if (dx < 0) {
      shopper.person.x += settings.walkSpeed;
      shopper.person.rotation = settings.personRight;
    }

  },
  stateWalkToColumn: function (shopper) {
    var dx = shopper.person.x - shopper.nextTargetX;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
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
    if (Math.abs(dy) < settings.walkSpeed * 2) {
      shopper.stateUpdate = this.stateWalkToCrossWalk;
    } else {
      shopper.person.y -= settings.walkSpeed;
      shopper.person.rotation = settings.personUp;
    }
  },
  stateWalkToCrossWalk: function (shopper) {
    var dx = shopper.person.x - 400;
    if (Math.abs(dx) < settings.walkSpeed * 2) {
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
    if (Math.abs(dy) < settings.walkSpeed * 2) {
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
