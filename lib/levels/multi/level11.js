
module.exports = {
  ai: {
    maxSpeed: 15,
    reaction: 0.2,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 2.0
  },

  player: {
    shields:11
  },

  set: 'random',

  extras: [
    {id: 'extralife'},
    {id: 'laser'},
    {id: 'fog'},
    {id: 'paddleresize'},
    {id: 'mirroredcontrols'},
    {id: 'ghostball',round:2},
    {id: 'bulletproof', round:2},
    {id: 'timebomb', round:3},
  ]
}
