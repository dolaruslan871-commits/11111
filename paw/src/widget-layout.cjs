const COLLAPSED_WIDTH = 320;
const EXPANDED_WIDTH = 680;
function widgetLayout(anchor, area, expanded) {
  const width = Math.min(expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH, area.width);
  const height = Math.min(620, area.height);
  // Anchor is the main card's screen position, not the previous wide window.
  const leftPanel = expanded && anchor.x + width > area.x + area.width;
  const desiredX = leftPanel ? anchor.x - (width - Math.min(COLLAPSED_WIDTH, area.width)) : anchor.x;
  return {x:Math.round(Math.max(area.x,Math.min(desiredX,area.x+area.width-width))),
    y:Math.round(Math.max(area.y,Math.min(anchor.y,area.y+area.height-height))),width,height,leftPanel};
}
module.exports = {widgetLayout,COLLAPSED_WIDTH,EXPANDED_WIDTH};
