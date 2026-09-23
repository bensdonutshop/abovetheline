'use strict';
/*
 * Sorts each story into a kind (work / industry / media), and where it is
 * campaign work, an advertiser sector and a channel.
 *
 * Classification runs over the article's own text, not just the headline -
 * the refresher already downloads each page to check its paywall, and a
 * headline alone is far too thin to tell "Nike launches a film" from
 * "Nike reviews its media account".
 *
 * Nothing here is certain, so every function can return '' and the page shows
 * those stories rather than hiding them.
 */

const KIND = {
  work: [
    ['campaign', 3], ['new ad', 3], ['ad campaign', 4], ['brand platform', 4], ['rebrand', 4],
    ['commercial', 2], ['the spot', 3], ['tvc', 3], ['brand film', 4], ['short film', 2],
    ['launches', 2], ['unveils', 2], ['debuts', 2], ['rolls out', 2], ['stars in', 3],
    ['directed by', 3], ['voiced by', 2], ['created by', 2], ['out-of-home', 2],
    ['work of the week', 4], ['ads of the week', 4], ['case study', 2], ['creative idea', 3],
    ['new ad', 4], ['latest ad', 4], ['classic ad', 4], ['ad stars', 4], ['the ad', 2],
    ['new spot', 4], ['anthem', 3], ['hero film', 4], ['teaser', 2], ['revives', 3],
    ['brand campaign', 5], ['global campaign', 5], ['christmas campaign', 5],
    ['marketing campaign', 4], ['campaign stars', 4], ['fronts', 3], ['idents', 3],
    ['brings back', 2], ['returns with', 3],
    ['kampanj', 3], ['reklamfilm', 4], ['mainoskampanja', 4], ['mainoselokuva', 4]
  ],
  industry: [
    ['appoints', 4], ['appointed', 3], ['hires', 4], ['names', 2], ['promoted to', 4],
    ['joins', 3], ['steps down', 4], ['departs', 3], ['exits', 3],
    ['account win', 5], ['wins the', 3], ['media account', 4], ['agency of record', 5],
    ['account review', 5], ['pitch', 3], ['roster', 3], ['appointment', 3],
    ['merger', 4], ['acquires', 4], ['acquisition', 4], ['layoffs', 4], ['redundanc', 4],
    ['restructur', 4], ['headcount', 3], ['holding company', 4], ['opens office', 3],
    ['revenue', 3], ['quarterly results', 4], ['profit', 2], ['chief executive', 3],
    ['chief creative officer', 4], ['chief marketing officer', 3], ['managing director', 3],
    ['rekryterar', 4], ['utses', 3], ['nimitt\u00e4\u00e4', 4],
    // Awards results are trade business news, not the work itself.
    ['awards', 3], ['award winners', 5], ['wins gold', 4], ['shortlist', 4], ['jury', 4],
    ['grand prix winners', 4], ['festival', 2], ['d&ad', 3], ['effie', 3], ['one show', 3],
    ['clio awards', 4], ['title winners', 5], ['announces winners', 5],
    ['new business', 4], ['appoints', 4], ['partners with agency', 3]
  ],
  media: [
    ['retail media', 5], ['programmatic', 5], ['ad tech', 5], ['adtech', 5],
    ['connected tv', 5], [' ctv', 4], ['streaming', 3], ['measurement', 3], ['attribution', 4],
    ['third-party cookie', 5], ['privacy sandbox', 5], ['ad spend', 3], ['media buying', 4],
    ['inventory', 3], ['upfront', 4], ['impressions', 3], ['audience data', 4],
    ['demand-side', 5], ['supply-side', 5], ['media plan', 3], ['ad revenue', 3],
    ['first-party data', 4], ['walled garden', 4], ['mediebyrå', 4], ['mediatoimisto', 4]
  ]
};

const SECTOR = {
  'Automotive': ['automotive','car brand','carmaker','volvo','bmw','audi','mercedes','toyota','renault','ford','hyundai','lexus','nissan','porsche','volkswagen','tesla','kia','peugeot','electric vehicle'],
  'Food & Drink': ['lite n','liquid death','oatly','chobani','ben & jerry','haagen','cheetos','skittles','mars','snickers','huggies','pedigree','whiskas','deliveroo','just eat','doordash','uber eats','hellofresh','greggs','nando','food','snack','grocery brand','coca-cola','coke','pepsi','heinz','mcdonald','burger king','kfc','oreo','cadbury','nestlé','nestle','doritos','pringles','lay\'s','taco bell','domino','subway','starbucks','dunkin','kellogg','danone','mondelez'],
  'Alcohol': ['beer','brewer','heineken','guinness','carlsberg','budweiser','corona','stella artois','vodka','whisky','whiskey','gin','tequila','wine brand','absolut','smirnoff','jack daniel','diageo','tecate'],
  'Fashion & Beauty': ['vinted','depop','asos','shein','uniqlo','under armour','reebok','crocs','birkenstock','ralph lauren','burberry','the ordinary','rimmel','nivea','axe','lynx','vaseline','fashion','apparel','sneaker','nike','adidas','puma','gucci','prada','zara','h&m','levi','converse','new balance','beauty','cosmetics','skincare','dove','cerave','l\'oréal','loreal','sephora','maybelline','moncler','uniqlo'],
  'Technology': ['sonos','bose','dyson','squarespace','wix','duolingo','klaviyo','salesforce','hubspot','canva','adobe','spotify tech','dell','lenovo','oneplus','xiaomi','anker','tech brand','apple','google','samsung','microsoft','openai','anthropic','claude','chatgpt','nvidia','intel','software','saas','smartphone','ai company','meta platforms'],
  'Finance': ['coinbase','binance','robinhood','wise','nationwide','natwest','barclays','hsbc','santander','swedbank','nordea','lloyds','bank','banking','insurance','insurer','fintech','visa','mastercard','paypal','klarna','suncorp','axa','allianz','monzo','revolut','pension','mortgage','investment'],
  'Retail': ['stanley 1913','specsavers','currys','argos','john lewis','marks & spencer','zalando','etsy','wayfair','b&q','hornbach','canadian tire','tim hortons','retailer','supermarket','walmart','target','ikea','amazon','tesco','sainsbury','aldi','lidl','costco','shopper marketing','department store','primark','boots'],
  'Telecom': ['telecom','telco','mobile operator','vodafone','tele2','verizon','t-mobile','at&t','giffgaff','o2','orange','telia','elisa'],
  'Entertainment': ['tubi','roku','peacock','lego','mattel','barbie','tiktok shop','twitch','ea sports','riot games','sky','itv','channel 4','netflix','disney','spotify','hbo','paramount','warner bros','universal pictures','video game','gaming brand','playstation','xbox','nintendo','clash royale','film studio','streaming service'],
  'Travel': ['uber','lyft','bolt','trainline','eurostar','klm','lufthansa','emirates','qatar airways','marriott','hilton','airline','airways','hotel','booking.com','airbnb','expedia','tourism','visit sweden','travel brand','cruise','ryanair','easyjet','cathay'],
  'Charity & Public': ['charity','nonprofit','non-profit','ngo','public health','government campaign','council','awareness campaign','red cross','unicef','greenpeace','wwf','public service'],
  'Health & Pharma': ['life360','kids help phone','cancer','nhs','bupa','specsavers health','zoe','calm','headspace','pharma','pharmaceutical','novartis','pfizer','healthcare','hospital','medicine','patient','clinical','viatris','haleon']
};

const CHANNEL = {
  'Film': ['tv ad','tv spot','tvc','film','commercial','video ad','30-second','60-second','directed by','cinema'],
  'OOH': ['out-of-home','ooh','billboard','poster','outdoor ad','digital out-of-home','dooh','transit ad','fly-poster'],
  'Social': ['social media','tiktok','instagram','influencer','creator-led','creators','youtube','snapchat','reddit','x (twitter)','social campaign'],
  'Print': ['print ad','magazine ad','newspaper ad','press ad','print campaign'],
  'Audio': ['radio ad','audio ad','podcast ad','spotify ad','radio campaign','sonic branding'],
  'Experiential': ['experiential','activation','stunt','pop-up','installation','live event','immersive','brand experience'],
  'Gaming': ['in-game','roblox','fortnite','gaming campaign','metaverse','twitch']
};

function scoreList(hay, title, pairs) {
  let s = 0;
  for (const [term, w] of pairs) {
    if (hay.indexOf(term) >= 0) s += w;
    if (title.indexOf(term) >= 0) s += w * 2;   // the headline is the strongest evidence
  }
  return s;
}

function scoreWords(hay, title, words) {
  let s = 0;
  for (const t of words) {
    if (hay.indexOf(t) >= 0) s += 1;
    if (title.indexOf(t) >= 0) s += 3;
  }
  return s;
}

function best(scores, min) {
  let k = '', v = 0;
  for (const [key, val] of Object.entries(scores)) if (val > v) { k = key; v = val; }
  return v >= min ? k : '';
}

/** 'work' | 'industry' | 'media' | '' when nothing is clear enough. */
function kindOf(title, body) {
  const t = (title || '').toLowerCase();
  const h = ((title || '') + ' ' + (body || '')).toLowerCase();
  const s = {
    work: scoreList(h, t, KIND.work),
    industry: scoreList(h, t, KIND.industry),
    media: scoreList(h, t, KIND.media)
  };
  const winner = best(s, 4);
  if (!winner) return '';
  // A clear runner-up means we are guessing, and guessing is what the
  // "unclassified" bucket is for.
  const sorted = Object.values(s).sort((a, b) => b - a);
  if (sorted[0] < sorted[1] * 1.35) return '';
  return winner;
}

function sectorOf(title, body) {
  const t = (title || '').toLowerCase();
  const h = ((title || '') + ' ' + (body || '')).toLowerCase();
  const s = {};
  for (const [k, words] of Object.entries(SECTOR)) s[k] = scoreWords(h, t, words);
  return best(s, 3);
}

function channelOf(title, body) {
  const t = (title || '').toLowerCase();
  const h = ((title || '') + ' ' + (body || '')).toLowerCase();
  const s = {};
  for (const [k, words] of Object.entries(CHANNEL)) s[k] = scoreWords(h, t, words);
  return best(s, 3);
}

module.exports = {
  kindOf, sectorOf, channelOf,
  SECTORS: Object.keys(SECTOR),
  CHANNELS: Object.keys(CHANNEL)
};
