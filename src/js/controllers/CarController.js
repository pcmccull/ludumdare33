var settings = require("../settings");
var _ = require("underscore");
var collisionController = require("../controllers/CollisionController");

module.exports = {
  parkingSpaces: [],
  initialize: function () {
    _.bindAll(this,
      "stateLookForSpace",
      "stateDriveToColumn",
      "stateTurnRight",
      "stateTurnLeft",
      "stateDriveToSpace",
      "stateEnterParkingSpaceLeft",
      "stateEnterParkingSpaceRight",
      "stateBackingOutRight",
      "stateBackingOutLeft",
      "stateDriveUpToStopSign",
      "stateWaitAtStopSign",
      "stateDriveUpToTurnLeft",
      "stateDriveOutOfScreen",
      "startLeaving"
    );
    this.parkingSpaces = [];
    for (var iColumn = 0; iColumn < settings.columns; iColumn++) {
      for (var iRow = 0; iRow < settings.rows; iRow++) {
        if (!(iColumn === 1 && iRow === 2) &&
           !(iColumn === 2 && iRow === 2)) {
          this.parkingSpaces.push({
            row: iRow,
            column: iColumn,
            available: true,
          });
        }
      }
    }

  },
  updateCar: function (car) {
    car.stateUpdate(car);

  },
  stateLookForSpace: function (car) {
    var space = this.findParkingSpace();
    car.spaceTarget = space;
    car.stateUpdate = this.stateDriveToColumn;
    space.available = false;
    this.updateCar(car);
  },
  stateDriveToColumn: function (car) {
    var columnX = this.getLotDownX(car.spaceTarget);

    if (car.position.x < columnX - settings.turnRadius) {
      if (!collisionController.canMoveRight(car, car.velocity) &&
        car.stuckCount < 10) {
        car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.x += car.velocity;
      }
    } else {

      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveToSpace;
      car.startRotation = car.rotation;
      car.desiredDx = settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.rotationDirection = 1;
      car.desiredRotation = settings.carDownRotation;
    }
  },
  stateTurnRight: function (car) {
    if (Math.abs(car.rotation - car.desiredRotation) > .1) {
      car.rotation += settings.carRotationVelocity * car.rotationDirection;
      var rotPercent = 1 - (car.desiredRotation - car.rotation) /
      (car.desiredRotation - car.startRotation);
      car.position.x = car.startX + rotPercent * car.desiredDx;
      car.position.y = car.startY + rotPercent * car.desiredDy;
    } else {
      car.rotation = car.desiredRotation;
      car.stateUpdate = car.nextStateUpdate;
    }
  },
  stateTurnLeft: function (car) {
    if (Math.abs(car.rotation - car.desiredRotation) > .1) {
      car.rotation += settings.carRotationVelocity * car.rotationDirection;
      var rotPercent = 1 - (car.desiredRotation - car.rotation) /
      (car.desiredRotation - car.startRotation);
      car.position.x = car.startX + rotPercent * car.desiredDx;
      car.position.y = car.startY + rotPercent * car.desiredDy;

    } else {
      car.rotation = car.desiredRotation;
      car.stateUpdate = car.nextStateUpdate;
    }
  },
  stateDriveToSpace: function (car) {
    var spaceY = this.getSpaceY(car.spaceTarget);
    if (car.position.y < spaceY - settings.turnRadius) {
      if (!collisionController.canMoveDown(car, car.velocity)
       && car.stuckCount < 10) {
        car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y += car.velocity;
      }

    } else {

      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      if (car.spaceTarget.column % 2 === 0) {
        car.desiredRotation = settings.carRightRotation;
        car.desiredDx = -settings.turnRadius;
        car.desiredDy = settings.turnRadius;
        car.rotationDirection = 1;
        car.stateUpdate = this.stateTurnRight;
        car.nextStateUpdate = this.stateEnterParkingSpaceRight;
      } else {
        car.desiredDx = settings.turnRadius;
        car.desiredDy = settings.turnRadius;
        car.desiredRotation = settings.carLeftRotation;
        car.rotationDirection = -1;
        car.stateUpdate = this.stateTurnLeft;
        car.nextStateUpdate = this.stateEnterParkingSpaceLeft;
      }
    }
  },
  stateEnterParkingSpaceLeft: function (car) {
    var targetX = this.getSpaceX(car.spaceTarget);
    if (car.position.x < targetX) {
      car.position.x += car.velocity;
    } else {
      car.isParked = true;
      console.log("car parked", car.spaceTarget);

    }
  },
  stateEnterParkingSpaceRight: function (car) {
    var targetX = this.getSpaceX(car.spaceTarget);
    if (car.position.x > targetX) {
      car.position.x -= car.velocity;
    } else {
      car.isParked = true;
      console.log("car parked", car.spaceTarget);

    }
  },
  startLeaving: function (car) {
    if (car.spaceTarget.column % 2 === 0) {
      car.stateUpdate = this.stateBackingOutLeft;
    } else {
      car.stateUpdate = this.stateBackingOutRight;
    }
    car.isParked = false;
  },
  stateBackingOutRight: function (car) {
    var targetX = this.getLotUpX(car.spaceTarget);
    if (car.position.x > targetX + settings.turnRadius) {
      car.position.x -= car.velocity;
    } else {
      car.spaceTarget.available = true;
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = -settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.desiredRotation = settings.carUpRotationNeg;
      car.rotationDirection = -1;
      car.stateUpdate = this.stateTurnLeft;
      car.nextStateUpdate = this.stateDriveUpToStopSign;
    }
  },
  stateBackingOutLeft: function (car) {
    var targetX = this.getLotUpX(car.spaceTarget);
    if (car.position.x < targetX - settings.turnRadius) {
      car.position.x += car.velocity;
    } else {
      car.spaceTarget.available = true;
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = settings.turnRadius;
      car.desiredDy = settings.turnRadius;
      car.desiredRotation = settings.carUpRotation;
      car.rotationDirection = 1;
      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveUpToStopSign;
    }
  },
  stateDriveUpToStopSign: function (car) {
    var targetY = settings.stopSignY;
    if (car.position.y > targetY) {
      if (!collisionController.canMoveUp(car, -car.velocity)
       && car.stuckCount < 10) {
          car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y -= car.velocity;
      }

    } else {
      car.stopTime = (+ new Date) + 2000 * Math.random();
      car.stateUpdate = this.stateWaitAtStopSign;
    }
  },
  stateDriveUpToTurnLeft: function (car) {
    var targetY = settings.roadLeftY;
    if (car.position.y > targetY + settings.turnRadius) {
      if (!collisionController.canMoveUp(car, -car.velocity)
       && car.stuckCount < 10) {
          car.stuckCount++;
        return;
      } else {
        car.stuckCount = 0;
        car.position.y -= car.velocity;
      }
    } else {
      car.startRotation = car.rotation;
      car.startX = car.position.x;
      car.startY = car.position.y;
      car.desiredDx = -settings.turnRadius * 2;
      car.desiredDy = settings.roadLeftY - car.startY;
      car.desiredRotation = settings.carRightRotationNeg;
      car.rotationDirection = -1;
      car.stateUpdate = this.stateTurnRight;
      car.nextStateUpdate = this.stateDriveOutOfScreen;
    }
  },
  stateWaitAtStopSign: function (car) {
    if (car.stopTime < (+ new Date)) {
      car.rotation = settings.carUpRotationNeg;
      car.stateUpdate = this.stateDriveUpToTurnLeft;
    }
  },
  stateDriveOutOfScreen: function (car) {
    var columnX = -100;

    if (car.position.x > columnX ) {
      if (!collisionController.canMoveLeft(car, car.velocity)) {
        return;
      } else {
        car.position.x -= car.velocity;
      }
    } else {
      car.readyToBeDestroyed = true;
    }
  },
  addCar: function () {
    var car = game.add.sprite(0,0, "sprites");
    car.frameName= "car" + (Math.floor(Math.random() * 4) + 1);
    car.anchor.x = 0.5;
    car.anchor.y = 0.5;
    car.isParked = false;
    car.stuckCount = 0;
    car.velocity = settings.carVelocity + Math.random() * settings.carRandomVelocityChange;
    car.objectType = "car"
    car.getBounds = function () {
      return {
        top: this.top + settings.carSpace*2,
        bottom: this.bottom - settings.carSpace*2,
        left: this.left + settings.carSpace,
        right: this.right - settings.carSpace,
      };
    };

    car.stateUpdate = this.stateLookForSpace;
    return car;
  },
  placeAtEntrance: function (car) {
    car.position.y = settings.roadRightY;
    car.position.x = -car.width;
  },
  moveCarToRandomSpace: function (car) {
    car.position.x = settings.spacesX[Math.floor(Math.random()* settings.columns)];
    car.position.y = settings.spaces1Y +
      Math.floor(Math.random() * settings.rows) * settings.spaceOffset ;
  },
  moveCarToSpace: function (car, space) {

    car.position.x = settings.spacesX[space.column];
    car.position.y = settings.spaces1Y +
      Math.floor(space.row) * settings.spaceOffset ;
    car.rotation = ((space.column + 1) % 2) * Math.PI;
    space.available = false;
  },
  parkCarInOpenSpace: function (car) {
    var space = this.findParkingSpace();
    car.isParked = true;
    this.moveCarToSpace(car, space);
    car.spaceTarget = space;
  },
  getLotDownX: function (space) {
    if (space.column < 2) {
      return settings.lot1DownX;
    } else {
      return settings.lot2DownX;
    }
  },
  getLotUpX: function (space) {
    if (space.column < 2) {
      return settings.lot1UpX;
    } else {
      return settings.lot2UpX;
    }
  },
  getSpaceY: function (space) {
    return settings.spaces1Y + space.row * settings.spaceOffset
  },
  getSpaceX: function (space) {
    return settings.spacesX[space.column];
  },
  findParkingSpace: function () {
    var openings = this.getOpenSpaces();
    var evaluate = _.min; //most people park closest to entrance
    if (Math.random() < 0.06) {
       evaluate = _.max; //some people park far away
    }
    return evaluate(openings, function (space) {
      return space.row
          + Math.abs(space.column - 1) + Math.random() * 10 ; //add some uncertainty about where to park

    });
  },
  getOpenSpaces: function () {
    return _.filter(this.parkingSpaces, {available: true})
  }
};
