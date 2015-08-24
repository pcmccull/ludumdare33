var GameStates = require("states/GameStates");
module.exports = {
  preload: function () {
  },
  create: function () {
    var style = { font: "25px Arial", fill: "#FFFAD5", align: "center" };

    game.add.text(80, 150, "You harrased an innocent shopper, you're fired!", style);
    var scoreText = "You found " + window.monstersFound + " monsters.";
    if (window.monstersEscaped === 0 && window.monstersFound > 0) {
      scoreText += " You didn't let any monsters escape!";

    } else if (window.monstersEscaped > 0){
        scoreText += " But, you let " + window.monstersEscaped  +" monsters escape.";
    }

      game.add.text(80, 200, scoreText, style);

    game.add.text(80, 250, "Click to try again", style);

    game.add.text(80, 450, "Tip: Monsters don't return their carts.", style);

  },
  update: function () {
    if (game.input.activePointer.isDown)
       {
           game.state.start(GameStates.menu);
       }
  }
}
