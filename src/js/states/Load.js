var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
    game.add.text(80, 150, "loading...", {font: "30px Courier", fill: "#fffff"});

    game.background = this.add.sprite(0, 0, 'preloaderBackground');
    	game.preloadBar = this.add.sprite(300, 400, 'preloaderBar');
    	game.load.setPreloadSprite(game.preloadBar);
    game.time.advancedTiming = true;
    game.load.atlasJSONHash("sprites", "assets/sprites.png", "assets/sprites.json");

  },
  create: function () {
    game.state.start(GameStates.menu);
  }
}
