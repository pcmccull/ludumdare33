var Phaser = window.Phaser
var GameStates = require("states/GameStates");
var GameStateClazzes = require("states/GameStateClazzes");
var game = window.game = new Phaser.Game(800, 600, Phaser.AUTO, "game", null, true, false);
for (var state in GameStates) {
  if (GameStates.hasOwnProperty(state)) {
    game.state.add(GameStates[state], GameStateClazzes[state].clazz);
  }
}
game.state.start(GameStates.boot);
