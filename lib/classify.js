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
  'Automotive': ['parkin','parking','tyre','tire brand','automotive','car brand','carmaker','car maker','vehicle','motor','dealership',
    'volvo','bmw','audi','mercedes','toyota','renault','ford','hyundai','lexus','nissan','porsche',
    'volkswagen','tesla','kia','peugeot','citroen','skoda','seat','fiat','jeep','mazda','subaru',
    'honda','suzuki','dacia','opel','vauxhall','mini cooper','land rover','jaguar','bentley',
    'ferrari','lamborghini','mycar','electric vehicle','michelin','pirelli','goodyear','shell v-power'],

  'Food & Drink': ['pepsico','coffee mate','coffee-mate','creamer','energy drink','primo water','sting energy','soft drink','beverage','dr pepper','maple leaf foods','puck cheese','lay\'s','lays','foods','dairy brand','bakery','kitchen brand','lipton ice','food','snack','grocery','confectionery','restaurant','fast food','cereal','dairy',
    'coca-cola','coke','pepsi','fanta','sprite','heinz','mcdonald','burger king','kfc','oreo','cadbury',
    'nestle','nestlé','doritos','pringles','cheetos','lay\'s','taco bell','domino','subway','starbucks',
    'dunkin','kellogg','danone','mondelez','kitkat','kit kat','popeyes','chupa chups','skittles','mars',
    'snickers','m&m','milka','haribo','ben & jerry','magnum','oatly','chobani','liquid death','red bull',
    'monster energy','lipton','nespresso','illy','lavazza','knorr','hellmann','maggi','barilla','ferrero',
    'nutella','pringle','jell-o','instacart','hellofresh','deliveroo','just eat','doordash','uber eats',
    'greggs','nando','tim hortons','wendy','chipotle','pizza hut','tra mongkut','wikifarmer','mercado livre',
    'mercado libre','brahma','pedigree','whiskas','purina','felix'],

  'Alcohol': ['amstel','hawkstone','grolsch','estrella','san miguel','birra','beer','brewer','brewery','lager','cider','spirits','distillery','vodka','whisky','whiskey',
    'gin','rum','tequila','mezcal','wine','champagne','prosecco','cocktail',
    'heineken','guinness','carlsberg','budweiser','corona','stella artois','peroni','asahi','tecate',
    'aguila','cerveza victoria','modelo','absolut','smirnoff','jack daniel','johnnie walker','jameson',
    'bacardi','captain morgan','diageo','pernod','campari','aperol','moet','veuve','nikka','suntory'],

  'Fashion & Beauty': ['colgate','the realreal','realreal','on running shoes','ships japan','optical','eyewear brand','l\'oreal luxe','opella','fashion','apparel','clothing','sneaker','footwear','eyewear','jewellery','jewelry',
    'cosmetics','skincare','haircare','makeup','fragrance','perfume','luxury house','couture',
    'nike','adidas','puma','reebok','under armour','new balance','asics','on running','columbia sportswear',
    'gucci','prada','chanel','dior','hermes','louis vuitton','balenciaga','moncler','burberry','tiffany',
    'zara','h&m','uniqlo','levi','converse','crocs','birkenstock','vans','timberland','ralph lauren',
    'shein','asos','vinted','depop','simons','ships tokyo',
    'dove','cerave','l\'oreal','l\'oréal','loreal','nivea','garnier','maybelline','sephora','rimmel',
    'the ordinary','vaseline','axe deodorant','lynx','boticario','boticário','kotex','tampax','always',
    'gillette','olay','pantene','head & shoulders'],

  'Technology': ['threads app','instagram','youtube','snapchat','tiktok','linkedin','pinterest','reddit','whatsapp','messenger app','social platform','technology','software','saas','app','platform','device','semiconductor','cloud',
    'apple','google','samsung','microsoft','openai','anthropic','claude','chatgpt','nvidia','intel','amd',
    'sony','lg electronics','huawei','xiaomi','oneplus','motorola','dell','lenovo','hp inc','asus',
    'sonos','bose','dyson','gopro','garmin','fitbit','oura','logitech','anker',
    'squarespace','wix','shopify','stripe','slack','notion','figma','canva','adobe','salesforce','hubspot',
    'klaviyo','duolingo','spotify tech','meta platforms','coinbase','binance','back market','uva app'],

  'Finance': ['bank','banking','fintech','payments','investment','brokerage','pension','mortgage','credit card',
    'visa','mastercard','amex','american express','paypal','klarna','revolut','monzo','n26','wise',
    'robinhood','nationwide','natwest','barclays','hsbc','santander','lloyds','swedbank','nordea','seb bank',
    'danske bank','bbva','bnp paribas','societe generale','bradesco','itau','bcp','banco','credit union'],

  'Insurance': ['insurance','insurer','underwriter','policyholder','home insurance','car insurance',
    'life insurance','health cover','claims','premiums',
    'axa','suncorp','allianz','aviva','zurich insurance','generali','geico','progressive insurance',
    'state farm','aegon','if insurance','folksam','lansforsakringar','länsförsäkringar','tryg','shield insurance'],

  'Retail & Commerce': ['flipkart','big billion days','shein retail','temu','alibaba','rakuten','otto group','loods 5','camara colombiana','chamber of commerce','garden centre','homeware store','retailer','retail','supermarket','grocer','department store','e-commerce','marketplace',
    'shopper','checkout','high street','walmart','target','ikea','amazon','tesco','sainsbury','asda','aldi',
    'lidl','costco','carrefour','auchan','intermarche','intermarché','primark','boots','currys','argos',
    'john lewis','marks & spencer','zalando','etsy','wayfair','b&q','canadian tire','albertsons','kroger',
    'coop','ica','hornbach','leroy merlin','de\'longhi','delonghi'],

  'Health & Pharma': ['specsavers','optometry','optician','dental','toothpaste','nycoplus','tupharma','nichii gakkan','1001 optometry','care home','elderly care','pharma','pharmaceutical','medicine','clinical','patient','hospital','healthcare',
    'diagnosis','treatment','therapy','vaccine','cancer','mental health','wellbeing',
    'novartis','pfizer','astrazeneca','gsk','sanofi','bayer','roche','haleon','viatris','viatri','moderna',
    'johnson & johnson','nhs','bupa','kids help phone','cancer support','lalcec','idomed','farmacias',
    'life360','autism society','ladywell','somos martina'],

  'Entertainment & Gaming': ['festival','music festival','way out west','jazz is dead','concert','theatre','broadway','cinema chain','film studio','streaming service','music label','video game','gaming','esports',
    'netflix','disney','hbo','paramount','warner bros','universal pictures','amazon prime video','tubi',
    'roku','peacock','spotify','apple music','tidal','playstation','xbox','nintendo','clash royale',
    'electronic arts','ea sports','riot games','ubisoft','roblox','fortnite','twitch','berghain',
    'a$ap rocky','bad bunny','rosalia','rosalía','lego','mattel','barbie','hasbro'],

  'Travel & Tourism': ['indrive','ride-hailing','ride hailing','grab app','gojek','blablacar','airline','airways','aviation','hotel','hospitality','tourism','tourist board',
    'destination','holiday','cruise','booking.com','airbnb','expedia','trivago','skyscanner','ryanair',
    'easyjet','lufthansa','klm','emirates','qatar airways','cathay','sas airlines','finnair','norwegian air',
    'marriott','hilton','accor','visit sweden','visit finland','embratur','eurostar','trainline','uber',
    'lyft','bolt ride'],

  'Charity & Nonprofit': ['sos oceano','sea cleaners','women for change','chorogusan','association antoine','ocean conservation','wildlife','survivor','advocacy','charity','nonprofit','non-profit','ngo','foundation','donation','fundraising',
    'volunteer','awareness campaign','humanitarian','red cross','unicef','greenpeace','wwf','oxfam',
    'amnesty','caritas','missing people','reporters without borders','iucn','doctors without borders',
    'save the children','fuck cancer','change the ref','too good'],

  'Government & Public': ['ville de paris','city of','municipal','senatur','armed force','ministry of','misterio publico','ministerio publico','prosecutor','olympic committee','international olympic','government','ministry','public sector','municipality','city council','state agency',
    'public service','census','election commission','police','fire service','army','defence','tax authority',
    'european parliament','european commission','nhs england','la poste','sapeurs pompiers','ministerio',
    'ministério','public prosecutor','whanau ora','whānau ora','comando con venezuela','abradee'],

  'Household & Home': ['goodwipes','wipes','toilet paper','paper towel','air freshener','unilever','household','cleaning','detergent','laundry','tissue','homecare','furniture','appliance',
    'diy','hardware store','cif','andrex','persil','ariel','fairy liquid','finish dishwasher','domestos',
    'febreze','glade','swiffer','huggies','pampers','kleenex','duracell','philips home'],

  'Sport': ['sport club','corinthians','football','boxing','the ring boxing','olympics','olympic','athlete','sporting event','the ring boxing','football club','soccer club','basketball','olympics','paralympic','athletics','marathon',
    'stadium','league','fifa','uefa','nba','nfl','premier league','wisla','wisła','club deportivo',
    'sports team','sponsorship of sport','uberlandia','uberlândia'],

  'Energy & Utilities': ['energy','utility','electricity','power grid','renewable','solar','wind power',
    'oil and gas','petrol','fuel','water company','plenitude','fortum','vattenfall','eon','e.on','iberdrola',
    'enel','shell','bp ','total energies','equinor','statkraft'],

  'Industry & B2B': ['lab-grown leather','lab grown leather','leather','materials science','fertiliser','jcdecaux','out-of-home media owner','manufacturing','industrial','logistics','supply chain','engineering','construction',
    'agriculture','fertilizer','mining','bearings','b2b brand','wholesale','skf','vale sa','caterpillar',
    'siemens','abb','bosch','honeywell','maersk','dhl','fedex','ups ','tigris'],

  'Media & Telecom': ['telstra','new york times','nytimes','abc network','abbott elementary','cbs','nbc','fox news','guardian','le monde','el pais','frecuencia latina','broadcast','television channel','news channel','publishing house','newspaper','magazine','broadcaster','publisher','radio station','podcast network',
    'telecom','telco','mobile operator','broadband','npr','bbc','itv','channel 4','czech television',
    'la union newspaper','vodafone','tele2','telia','elisa','verizon','t-mobile','at&t','giffgaff','o2 ',
    'orange telecom','three mobile','sky media']
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

const wordRe = {};
function hasTerm(hay, t) {
  // Brand names need a boundary in front, or "on" (the shoe) matches "online".
  // They must NOT need one behind: "pepsi" has to match "PepsiCo", "volvo" has
  // to match "Volvo's". Only very short terms need both, where a loose tail
  // would collide with ordinary words.
  if (t.length >= 7 || t.indexOf(' ') >= 0) return hay.indexOf(t) >= 0;
  let re = wordRe[t];
  if (!re) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tail = t.length <= 4 ? '([^a-z0-9\u00e0-\u024f]|$)' : '';
    re = wordRe[t] = new RegExp('(^|[^a-z0-9\u00e0-\u024f])' + esc + tail, 'i');
  }
  return re.test(hay);
}

function scoreWords(hay, title, words) {
  let s = 0;
  for (const t of words) {
    if (hasTerm(hay, t)) s += 1;
    if (hasTerm(title, t)) s += 3;
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

// Sources write DE'LONGHI, LAY'S and L'OREAL with curly apostrophes, which
// would otherwise miss every brand spelled with a straight one.
function fold(x) {
  return String(x || '').toLowerCase()
    .replace(/[\u2018\u2019\u02bc\u0060\u00b4]/g, "'")
    .replace(/\u00e9/g, 'e').replace(/\u00e8/g, 'e').replace(/\u00ea/g, 'e')
    .replace(/\u00e1/g, 'a').replace(/\u00e0/g, 'a').replace(/\u00e3/g, 'a')
    .replace(/\u00ed/g, 'i').replace(/\u00f3/g, 'o').replace(/\u00f5/g, 'o')
    .replace(/\u00fa/g, 'u').replace(/\u00e7/g, 'c');
}

function sectorOf(title, body) {
  const t = fold(title);
  const h = fold((title || '') + ' ' + (body || ''));
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
