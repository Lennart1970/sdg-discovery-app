import { insertOrganization, insertSourceFeed } from "./db";

const organizations = [
  { orgName: "UN", orgType: "UN", orgCountry: "International", orgWebsite: "https://sdgs.un.org" },
  { orgName: "World Bank", orgType: "MDB", orgCountry: "International", orgWebsite: "https://www.worldbank.org" },
  { orgName: "Asian Development Bank", orgType: "MDB", orgCountry: "International", orgWebsite: "https://www.adb.org" },
  { orgName: "African Development Bank", orgType: "MDB", orgCountry: "International", orgWebsite: "https://www.afdb.org" },
  { orgName: "European Commission", orgType: "EU", orgCountry: "EU", orgWebsite: "https://ec.europa.eu" },
  { orgName: "USAID", orgType: "Government", orgCountry: "USA", orgWebsite: "https://www.usaid.gov" },
  { orgName: "DFID", orgType: "Government", orgCountry: "UK", orgWebsite: "https://www.gov.uk/dfid" },
  { orgName: "GIZ", orgType: "Government", orgCountry: "Germany", orgWebsite: "https://www.giz.de" },
  { orgName: "UNDP", orgType: "UN", orgCountry: "International", orgWebsite: "https://www.undp.org" },
  { orgName: "UNEP", orgType: "UN", orgCountry: "International", orgWebsite: "https://www.unep.org" },
  { orgName: "FAO", orgType: "UN", orgCountry: "International", orgWebsite: "https://www.fao.org" },
  { orgName: "WHO", orgType: "UN", orgCountry: "International", orgWebsite: "https://www.who.int" },
  { orgName: "UNICEF", orgType: "UN", orgCountry: "International", orgWebsite: "https://www.unicef.org" },
  { orgName: "Oxfam", orgType: "NGO", orgCountry: "International", orgWebsite: "https://www.oxfam.org" },
  { orgName: "WWF", orgType: "NGO", orgCountry: "International", orgWebsite: "https://www.worldwildlife.org" },
  { orgName: "Gates Foundation", orgType: "NGO", orgCountry: "USA", orgWebsite: "https://www.gatesfoundation.org" },
  { orgName: "Unilever", orgType: "Corporate", orgCountry: "UK", orgWebsite: "https://www.unilever.com" },
  { orgName: "Patagonia", orgType: "Corporate", orgCountry: "USA", orgWebsite: "https://www.patagonia.com" },
];

const sourceFeeds = [
  { orgName: "UN", feedName: "SDG Partnerships", feedType: "registry", baseUrl: "https://sdgs.un.org/partnerships", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "World Bank", feedName: "Projects Database", feedType: "registry", baseUrl: "https://projects.worldbank.org", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "Asian Development Bank", feedName: "Project Documents", feedType: "pdf", baseUrl: "https://www.adb.org/projects", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "African Development Bank", feedName: "Project Portal", feedType: "registry", baseUrl: "https://www.afdb.org/en/projects-and-operations", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "European Commission", feedName: "Horizon Europe", feedType: "registry", baseUrl: "https://ec.europa.eu/info/funding-tenders/opportunities/portal", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "USAID", feedName: "Development Data Library", feedType: "pdf", baseUrl: "https://dec.usaid.gov", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "DFID", feedName: "R4D Portal", feedType: "registry", baseUrl: "https://r4d.org", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "GIZ", feedName: "Project Database", feedType: "registry", baseUrl: "https://www.giz.de/en/worldwide", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "UNDP", feedName: "Project Documents", feedType: "pdf", baseUrl: "https://www.undp.org/projects", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "UNEP", feedName: "Environmental Reports", feedType: "pdf", baseUrl: "https://www.unep.org/resources", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "FAO", feedName: "Country Profiles", feedType: "pdf", baseUrl: "https://www.fao.org/countryprofiles", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "WHO", feedName: "Health Reports", feedType: "pdf", baseUrl: "https://www.who.int/publications", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "UNICEF", feedName: "Programme Reports", feedType: "pdf", baseUrl: "https://www.unicef.org/reports", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "Oxfam", feedName: "Research Reports", feedType: "pdf", baseUrl: "https://www.oxfam.org/en/research", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "WWF", feedName: "Conservation Projects", feedType: "registry", baseUrl: "https://www.worldwildlife.org/projects", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "Gates Foundation", feedName: "Grants Database", feedType: "registry", baseUrl: "https://www.gatesfoundation.org/about/committed-grants", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "Unilever", feedName: "Sustainability Reports", feedType: "pdf", baseUrl: "https://www.unilever.com/sustainability", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
  { orgName: "Patagonia", feedName: "Environmental Grants", feedType: "registry", baseUrl: "https://www.patagonia.com/actionworks/grants", crawlPolicy: JSON.stringify({ rate_limit: 1 }) },
];

export async function seedDatabase() {
  console.log("Seeding organizations...");
  for (const org of organizations) {
    await insertOrganization(org);
  }
  console.log(`✓ Seeded ${organizations.length} organizations`);

  console.log("Seeding source feeds...");
  for (const feed of sourceFeeds) {
    await insertSourceFeed(feed);
  }
  console.log(`✓ Seeded ${sourceFeeds.length} source feeds`);

  console.log("Database seeding complete!");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
