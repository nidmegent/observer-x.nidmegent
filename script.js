'use strict';
// Phase 1: demo-only data. No VALORANT client connection or automatic game telemetry.
const demoMatch = {
  teamA: { name: 'TEAM ALPHA', score: 8, side: 'ATTACK', players: [
    { name: 'ALPHA 1', agent: 'JETT' }, { name: 'ALPHA 2', agent: 'SOVA' },
    { name: 'ALPHA 3', agent: 'OMEN' }, { name: 'ALPHA 4', agent: 'KILLJOY' },
    { name: 'ALPHA 5', agent: 'KAY/O' }
  ] },
  teamB: { name: 'TEAM BRAVO', score: 6, side: 'DEFENSE', players: [
    { name: 'BRAVO 1', agent: 'RAZE' }, { name: 'BRAVO 2', agent: 'FADE' },
    { name: 'BRAVO 3', agent: 'BRIMSTONE' }, { name: 'BRAVO 4', agent: 'CYPHER' },
    { name: 'BRAVO 5', agent: 'SKYE' }
  ] },
  map: 'ASCENT', mapNumber: 1, bestOf: 3, round: 15, timer: '1:12',
  eventName: 'OBSERVER X CHAMPIONSHIP', matchInfo: 'GRAND FINAL'
};
const byId = id => document.getElementById(id);
function text(id, value) { byId(id).textContent = String(value ?? ''); }
function renderRoster(id, players) {
  const root = byId(id);
  root.replaceChildren();
  for (const player of players.slice(0, 5)) {
    const card = document.createElement('div'); card.className = 'player';
    const name = document.createElement('div'); name.className = 'player-name'; name.textContent = player.name || 'PLAYER';
    const meta = document.createElement('div'); meta.className = 'player-meta'; meta.textContent = `${player.agent || 'AGENT TBD'}  •  K/D/A —`;
    card.append(name, meta); root.append(card);
  }
}
function renderMatch(match) {
  text('teamAName', match.teamA.name); text('teamBName', match.teamB.name);
  text('teamASide', match.teamA.side); text('teamBSide', match.teamB.side);
  text('teamAScore', match.teamA.score); text('teamBScore', match.teamB.score);
  text('roundLabel', `ROUND ${match.round}`); text('timerLabel', match.timer);
  text('mapInfo', `${match.map}  •  MAP ${match.mapNumber}  •  BO${match.bestOf}`);
  text('eventName', match.eventName); text('matchInfo', match.matchInfo);
  renderRoster('rosterA', match.teamA.players); renderRoster('rosterB', match.teamB.players);
}
function scaleStage() {
  const stage = byId('stage');
  stage.style.transform = `scale(${window.innerWidth / 1920}, ${window.innerHeight / 1080})`;
}
const params = new URLSearchParams(window.location.search);
if (params.get('players') === '0') document.querySelectorAll('.roster').forEach(el => el.classList.add('hidden'));
if (params.get('footer') === '0') byId('eventName').parentElement.classList.add('hidden');
if (params.get('demo') === '0') byId('demoLabel').classList.add('hidden');
renderMatch(demoMatch);
scaleStage();
window.addEventListener('resize', scaleStage);
// Later: replace this demoMatch source with a validated Firebase match snapshot.
