'use strict';
// Agency city -> country and region, so awarded cases can be filtered the same
// way the news wire is. lovetheworkmore writes the city into the agency name.
const CITY = {
  // Europe
  london:['UK','europe'], manchester:['UK','europe'], dublin:['Ireland','europe'],
  paris:['France','europe'], marseille:['France','europe'],
  milan:['Italy','europe'], rome:['Italy','europe'],
  madrid:['Spain','europe'], barcelona:['Spain','europe'],
  berlin:['Germany','europe'], hamburg:['Germany','europe'], munich:['Germany','europe'],
  frankfurt:['Germany','europe'], dusseldorf:['Germany','europe'],
  amsterdam:['Netherlands','europe'], rotterdam:['Netherlands','europe'],
  brussels:['Belgium','europe'], lisbon:['Portugal','europe'], porto:['Portugal','europe'],
  zurich:['Switzerland','europe'], geneva:['Switzerland','europe'], vienna:['Austria','europe'],
  stockholm:['Sweden','europe'], gothenburg:['Sweden','europe'], malmo:['Sweden','europe'],
  oslo:['Norway','europe'], copenhagen:['Denmark','europe'], billund:['Denmark','europe'],
  helsinki:['Finland','europe'], reykjavik:['Iceland','europe'],
  athens:['Greece','europe'], istanbul:['Turkey','europe'],
  warsaw:['Poland','europe'], krakow:['Poland','europe'], prague:['Czechia','europe'],
  budapest:['Hungary','europe'], bucharest:['Romania','europe'], zagreb:['Croatia','europe'],
  // Americas
  'new york':['USA','global'], 'los angeles':['USA','global'], chicago:['USA','global'],
  miami:['USA','global'], minneapolis:['USA','global'], cupertino:['USA','global'],
  'san francisco':['USA','global'], portland:['USA','global'], seattle:['USA','global'],
  boulder:['USA','global'], purchase:['USA','global'], austin:['USA','global'],
  richmond:['USA','global'], atlanta:['USA','global'], detroit:['USA','global'],
  toronto:['Canada','global'], montreal:['Canada','global'], vancouver:['Canada','global'],
  'sao paulo':['Brazil','global'], 'rio de janeiro':['Brazil','global'],
  'mexico':['Mexico','global'], 'mexico city':['Mexico','global'], guadalajara:['Mexico','global'],
  'buenos aires':['Argentina','global'], bogota:['Colombia','global'], lima:['Peru','global'],
  santiago:['Chile','global'], 'san jose':['Costa Rica','global'], caracas:['Venezuela','global'],
  'puerto rico':['Puerto Rico','global'], montevideo:['Uruguay','global'],
  // APAC, MEA
  sydney:['Australia','global'], melbourne:['Australia','global'], auckland:['New Zealand','global'],
  tokyo:['Japan','global'], osaka:['Japan','global'], seoul:['South Korea','global'],
  shanghai:['China','global'], beijing:['China','global'], 'hong kong':['Hong Kong','global'],
  singapore:['Singapore','global'], bangkok:['Thailand','global'], mumbai:['India','global'],
  'new delhi':['India','global'], jakarta:['Indonesia','global'], manila:['Philippines','global'],
  dubai:['UAE','global'], 'tel aviv':['Israel','global'], cairo:['Egypt','global'],
  johannesburg:['South Africa','global'], lagos:['Nigeria','global'], nairobi:['Kenya','global']
};

function fold(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');   // strip accents: SÃO PAULO -> sao paulo
}

/** Reads the city out of an agency string like "LEO SYDNEY" or "GUT SAO PAULO". */
function placeOf(agency) {
  const a = fold(agency);
  let best = null;
  for (const city of Object.keys(CITY)) {
    if (a.indexOf(city) >= 0 && (!best || city.length > best.length)) best = city;
  }
  if (!best) return { country: '', region: 'global', city: '' };
  return { country: CITY[best][0], region: CITY[best][1], city: best };
}

module.exports = { placeOf, CITY };
