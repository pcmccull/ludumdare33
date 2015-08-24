var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
    
    game.load.image("preloaderBackground", "assets/preloaderBackground.png");
		game.load.image("preloaderBar", "assets/preloaderBar.png");
  },
  create: function () {
    game.state.start(GameStates.load);
  },
}
