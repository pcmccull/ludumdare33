module.exports = {
  objects: [],
  add: function (object) {
    this.objects.push(object);
  },
  canMoveRight: function (object, x) {
    var objectBounds = object.getBounds();
    var testBounds = {
      top: object.top,
      bottom: object.top + 1,
      left: objectBounds.left + x,
      right: objectBounds.right + x

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {

          if (object.objectType === "car"
          && testBounds.right < testObjectBounds.right) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveLeft: function (object, x) {

    var objectBounds = object.getBounds();
    var testBounds = {
      top: object.top,
      bottom: object.top + 1,
      left: objectBounds.left - x,
      right: objectBounds.right - x

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {

          if (object.objectType === "car"
          && testBounds.left > testObjectBounds.left) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveDown: function (object, y) {
    var objectBounds = object.getBounds();
    var testBounds = {
      top: objectBounds.top + y,
      bottom: objectBounds.bottom + y,
      left: object.left,
      right: object.left
    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {
          if (object.objectType === "car"
          && testBounds.bottom < testObjectBounds.bottom) {

            return false;
          }
        }
    }
    return true;
  },
  canMoveUp: function (object, y) {

    var objectBounds = object.getBounds();
    var testBounds = {
      top: objectBounds.top + y,
      bottom: objectBounds.bottom + y,
      left: object.right ,
      right: object.right

    }
    for (var i = 0; i < this.objects.length; i++) {
      var testObject = this.objects[i];
      var testObjectBounds = testObject.getBounds();
      if (object !== testObject && testObject.visible &&
        this.intersect(testBounds, testObjectBounds)) {
          if (object.objectType === "car"
          && testBounds.top > testObjectBounds.top) {

            return false;
          }
        }
    }
    return true;
  },
  intersect: function (r1, r2) {
    return !(r2.left > r1.right ||
             r2.right < r1.left ||
             r2.top > r1.bottom ||
             r2.bottom < r1.top);
  }
}
