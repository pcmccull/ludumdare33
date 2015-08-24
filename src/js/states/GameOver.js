var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
  },
  create: function () {
    game.add.text(80, 150, "You harrased innocent people, you're fired!", {font: "20px Courier", fill: "#fffff"});

    game.add.text(80, 250, "Click to try again", {font: "20px Courier", fill: "#fffff"});
    var sprite = game.add.sprite(0,0, "title");
    sprite.scale.set(1.5, 1.5);

    //game.state.start(GameStates.play);
  },
  update: function () {
    if (game.input.activePointer.isDown)
       {
           game.state.start(GameStates.play);
       }
  }
}
