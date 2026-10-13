/**
 * Ping, pixel edition
 * -------------------
 * A 19 x 22 sprite drawn as SVG rects on a hard grid (1 unit = 1 pixel of
 * the sprite), from character maps. Every part that changes (eyes, mouth,
 * arms, feet, the signal arcs, the envelope) is its own group of frames,
 * and the stylesheet shows the frame that matches Ping's state classes:
 * blink, happy, sleep, dizzy, sad, talking, the arm poses, walking.
 *
 * Colours are classes, so the palette tokens recolour him:
 *   o outline   b body     h highlight   s shade
 *   k ink       w white    c tongue      t antenna tip
 */
(function (root) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var W = 19;
  var H = 22;
  // The body map's (0,0) sits at this offset in the canvas: room above for
  // the signal arcs and the envelope, and a column each side for the arms.
  var OX = 2;
  var OY = 5;

  var BODY = [
    ".......t.......",
    ".......s.......",
    "...ooooooooo...",
    "..ohhhhhhhhbo..",
    ".ohbbbbbbbbbso.",
    ".ohbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".obbbbbbbbbbso.",
    ".ossbbbbbbbsso.",
    "..ossssssssso..",
    "...ooooooooo...",
  ];

  // Frames: lists of [x, y, colour] in body coordinates.
  function px(list) {
    var out = [];
    list.split(" ").forEach(function (t) {
      if (!t) return;
      var p = t.split(",");
      out.push([+p[0], +p[1], p[2]]);
    });
    return out;
  }

  var FRAMES = {
    // Eyes: two 2x3 dark eyes with a white glint, and the ways they change.
    "eyes-open": px("4,6,w 5,6,k 4,7,k 5,7,k 4,8,k 5,8,k 9,6,w 10,6,k 9,7,k 10,7,k 9,8,k 10,8,k"),
    "eyes-blink": px("4,8,k 5,8,k 9,8,k 10,8,k"),
    "eyes-happy": px("3,8,k 4,7,k 5,7,k 6,8,k 8,8,k 9,7,k 10,7,k 11,8,k"),
    "eyes-sleep": px("3,8,k 4,8,k 5,8,k 9,8,k 10,8,k 11,8,k"),
    "eyes-dizzy": px("3,6,k 5,6,k 4,7,k 3,8,k 5,8,k 9,6,k 11,6,k 10,7,k 9,8,k 11,8,k"),
    "eyes-sad": px("4,7,w 5,7,k 4,8,k 5,8,k 9,7,w 10,7,k 9,8,k 10,8,k 3,6,k 11,6,k"),
    // Mouth: a small smile, open (two frames while talking), and sad.
    "mouth-smile": px("5,10,k 9,10,k 6,11,k 7,11,k 8,11,k"),
    "mouth-open": px("6,10,k 7,10,k 8,10,k 6,11,k 7,11,c 8,11,k 7,12,k"),
    "mouth-sad": px("6,10,k 7,10,k 8,10,k 5,11,k 9,11,k"),
  };

  // Arms and feet live outside the body, in canvas-relative body coordinates
  // (x may be -1 or 15, y may go above 0).
  var LIMBS = {
    "arms-rest": px("0,10,b 0,11,b 14,10,b 14,11,b"),
    "arms-cheer": px("0,4,b 0,3,b -1,2,b 14,4,b 14,3,b 15,2,b"),
    "arms-carry": px("0,5,b 0,4,b 1,3,b 2,2,b 14,5,b 14,4,b 13,3,b 12,2,b"),
    "arms-point-r": px("0,10,b 0,11,b 14,8,b 15,8,b 16,8,b"),
    "arms-point-l": px("14,10,b 14,11,b 0,8,b -1,8,b -2,8,b"),
    "arms-wave-a": px("0,10,b 0,11,b 14,5,b 15,4,b 15,3,b"),
    "arms-wave-b": px("0,10,b 0,11,b 14,6,b 15,6,b 16,5,b"),
    "arms-wave-l-a": px("14,10,b 14,11,b 0,5,b -1,4,b -1,3,b"),
    "arms-wave-l-b": px("14,10,b 14,11,b 0,6,b -1,6,b -2,5,b"),
    "arms-droop": px("0,12,b 0,13,b 14,12,b 14,13,b"),
    "feet-a": px("3,16,s 4,16,s 5,16,s 9,16,s 10,16,s 11,16,s"),
    "feet-b": px("2,16,s 3,16,s 4,16,s 10,16,s 11,16,s 12,16,s"),
    // Signal arcs above the antenna tip (7,0).
    "signal-1": px("6,-2,t 7,-2,t 8,-2,t 5,-1,t 9,-1,t"),
    "signal-2": px("5,-4,t 6,-4,t 7,-4,t 8,-4,t 9,-4,t 4,-3,t 10,-3,t 3,-2,t 11,-2,t"),
    // The envelope he carries over his head: white with an outline and a V.
    // The envelope he carries, resting on his head (the antenna folds away):
    // white with an outline and the flap's V in blue.
    envelope: px(
      "3,-4,o 4,-4,o 5,-4,o 6,-4,o 7,-4,o 8,-4,o 9,-4,o 10,-4,o 11,-4,o " +
        "3,-3,o 4,-3,b 5,-3,w 6,-3,w 7,-3,w 8,-3,w 9,-3,w 10,-3,b 11,-3,o " +
        "3,-2,o 4,-2,w 5,-2,b 6,-2,w 7,-2,w 8,-2,w 9,-2,b 10,-2,w 11,-2,o " +
        "3,-1,o 4,-1,w 5,-1,w 6,-1,b 7,-1,w 8,-1,b 9,-1,w 10,-1,w 11,-1,o " +
        "3,0,o 4,0,w 5,0,w 6,0,w 7,0,b 8,0,w 9,0,w 10,0,w 11,0,o " +
        "3,1,o 4,1,o 5,1,o 6,1,o 7,1,o 8,1,o 9,1,o 10,1,o 11,1,o",
    ),
  };

  function rect(g, x, y, c) {
    var r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x + OX);
    r.setAttribute("y", y + OY);
    r.setAttribute("width", 1.02);
    r.setAttribute("height", 1.02);
    r.setAttribute("class", "px-" + c);
    g.appendChild(r);
  }

  function group(parent, cls) {
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", cls);
    parent.appendChild(g);
    return g;
  }

  function draw(g, list) {
    list.forEach(function (p) {
      rect(g, p[0], p[1], p[2]);
    });
  }

  // Builds the sprite into an <svg>. Returns the groups the caller animates.
  function build(svg) {
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.classList.add("px-sprite");

    var shadow = group(svg, "px-shadow");
    draw(shadow, px("4,17,s 5,17,s 6,17,s 7,17,s 8,17,s 9,17,s 10,17,s"));

    var limbs = group(svg, "px-limbs");
    ["arms-rest", "arms-cheer", "arms-carry", "arms-point-r", "arms-point-l", "arms-wave-a", "arms-wave-b", "arms-wave-l-a", "arms-wave-l-b", "arms-droop", "feet-a", "feet-b"].forEach(function (k) {
      draw(group(limbs, "px-f px-" + k), LIMBS[k]);
    });

    var body = group(svg, "px-body");
    var antenna = group(body, "px-antenna");
    BODY.forEach(function (row, y) {
      row.split("").forEach(function (ch, x) {
        if (ch !== ".") rect(y < 2 ? antenna : body, x, y, ch);
      });
    });
    var face = group(svg, "px-face");
    var eyes = group(face, "px-eyes");
    ["eyes-open", "eyes-blink", "eyes-happy", "eyes-sleep", "eyes-dizzy", "eyes-sad"].forEach(function (k) {
      draw(group(k === "eyes-open" ? eyes : face, "px-f px-" + k), FRAMES[k]);
    });
    ["mouth-smile", "mouth-open", "mouth-sad"].forEach(function (k) {
      draw(group(face, "px-f px-" + k), FRAMES[k]);
    });

    var signal = group(svg, "px-signal");
    draw(group(signal, "px-f px-signal-1"), LIMBS["signal-1"]);
    draw(group(signal, "px-f px-signal-2"), LIMBS["signal-2"]);
    draw(group(svg, "px-f px-envelope"), LIMBS.envelope);

    return { eyes: eyes };
  }

  root.PingSprite = { build: build, W: W, H: H };
})(window);
