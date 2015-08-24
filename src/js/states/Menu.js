var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
  },
  create: function () {
    var title = game.add.sprite(0,0, "sprites");
    title.frameName= "menuScreen";
    title.tint = 0xFFFAD5;
    //game.state.start(GameStates.play);
  },
  update: function () {
    if (game.input.activePointer.isDown)
       {
           game.state.start(GameStates.play);
       }
  }
}
