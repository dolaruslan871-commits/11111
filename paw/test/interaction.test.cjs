const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
let pending;
const load = () =>
  (pending ||= import(
    "data:text/javascript;base64," +
      Buffer.from(
        fs.readFileSync(require.resolve("../src/pet-interactions.js"), "utf8"),
      ).toString("base64")
  ));
test("double petting, paw spam, tail, secret ear taps and spin are distinct", async () => {
  const { createPetInteractions } = await load();
  let now = 0;
  const actions = [],
    i = createPetInteractions(
      (x) => actions.push(x),
      () => now,
    );
  i.tap("body");
  assert.equal(actions.length, 0);
  i.doubleTap("body");
  assert.equal(actions.at(-1), "pet");
  for (let n = 0; n < 3; n++) {
    now += 100;
    i.tap("paw");
  }
  assert.equal(actions.at(-1), "angry");
  i.tap("tail");
  assert.equal(actions.at(-1), "chase-tail");
  for (let n = 0; n < 5; n++) {
    now += 100;
    i.tap("ear");
  }
  assert.equal(actions.at(-1), "detective");
  i.spin(260);
  now += 100;
  i.spin(260);
  assert.equal(actions.at(-1), "dance");
});
test("widely spaced taps do not anger pet", async () => {
  const { createPetInteractions } = await load();
  let now = 0;
  const actions = [],
    i = createPetInteractions(
      (x) => actions.push(x),
      () => now,
    );
  for (let n = 0; n < 5; n++) {
    i.tap("paw");
    now += 2000;
  }
  assert.deepEqual(actions, []);
});
