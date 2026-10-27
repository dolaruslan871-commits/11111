const DAY = 86400000;
function calendarDay(timestamp) {
  const date = new Date(timestamp);
  return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
}
function petAge(bornAt, now = Date.now()) {
  const birth = Number.isFinite(bornAt) && bornAt > 0 ? Math.min(bornAt,now) : now;
  const elapsedDays = Math.max(0,Math.floor((calendarDay(now)-calendarDay(birth))/DAY));
  return {age:elapsedDays+1,elapsedDays,growth:.84+.16*Math.pow(Math.min(elapsedDays/56,1),.65),
    stage:elapsedDays<14?'baby':elapsedDays<56?'young':'adult'};
}
function milestoneDate(bornAt, offset) {
  const date=new Date(bornAt);date.setHours(12,0,0,0);date.setDate(date.getDate()+offset);return date;
}
module.exports={calendarDay,petAge,milestoneDate};
