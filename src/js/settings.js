module.exports = {
  //car rotations
  carLeftRotation: 0,
  carRightRotation: Math.PI,
  carRightRotationNeg: -Math.PI,
  carDownRotation: Math.PI / 2,
  carUpRotation:  3*Math.PI / 2,
  carUpRotationNeg:  -Math.PI / 2,

  //car driving settings
  carVelocity: 5,
  carRandomVelocityChange: 2,
  carRotationVelocity: Math.PI/50,
  turnRadius: 25,

  //collision settings
  carSpace: -10,
  personSpace: 5,
  cartSpace: 5,

  //road and parking lot settings
  roadLeftY: 105,
  roadRightY: 155,
  stopSignY: 240,
  lot1DownX: 180,
  lot2DownX: 550,
  lot1UpX: 254,
  lot2UpX: 614,
  spacesX: [
    90,
    345,
    455,
    710
  ],
  spaces: 22,
  rows: 6,
  columns: 4,
  spaces1Y: 224,
  spaceOffset: 65,

  lotTop: 175,
  walkSpeed: .8,
  personLeft: 0,
  personRight: Math.PI,
  personUp: Math.PI/2,
  personDown: 3 * Math.PI/2,

  //people talking
  guiltySayings: [
    "I can't walk that far!",
    "They pay someone else to collect my cart!",
    "But I have kids in my car!",
    "It's too hot to return my cart.",
    "But, it was too far away!"
  ],
  innocentSayings: [
    "I would never leave my cart!",
    "I'm talking to management!",
    "I will never shop here again!",
    "Stop harassing me!",
    "I've been falsely accused! Again!"
  ]
}
