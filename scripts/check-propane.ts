// Check if PROPANE is mentioned on marina websites
async function checkPropane() {
  const marinas = [
    {
      name: 'Rodney Bay Marina',
      urls: [
        'https://www.igy-marinas.com/marina/rodney-bay-marina/',
        'https://ports.marinelink.com/ports/port/rodney-bay'
      ]
    },
    {
      name: 'Marigot Bay Marina',
      urls: [
        'https://www.marigotbayresort.com/marina',
        'https://ports.marinelink.com/ports/port/marigot-bay'
      ]
    }
  ];

  console.log('Checking for PROPANE service at marinas...\n');

  for (const marina of marinas) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${marina.name}`);
    console.log('='.repeat(60));

    for (const url of marina.urls) {
      try {
        console.log(`\nFetching: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
          console.log(`  ❌ Failed to fetch (${response.status})`);
          continue;
        }

        const html = await response.text();
        const lowerHtml = html.toLowerCase();

        // Check for propane mentions
        const propaneMentions = [
          'propane',
          'lpg',
          'liquid petroleum gas',
          'cooking gas'
        ];

        const found: string[] = [];
        for (const term of propaneMentions) {
          if (lowerHtml.includes(term)) {
            found.push(term);
          }
        }

        if (found.length > 0) {
          console.log(`  ✅ FOUND: ${found.join(', ')}`);

          // Try to extract context around the word
          const propaneIndex = lowerHtml.indexOf('propane');
          if (propaneIndex !== -1) {
            const start = Math.max(0, propaneIndex - 100);
            const end = Math.min(html.length, propaneIndex + 100);
            const context = html.substring(start, end).replace(/\s+/g, ' ').trim();
            console.log(`  Context: ...${context}...`);
          }
        } else {
          console.log(`  ❌ No propane mentions found`);
        }

      } catch (error) {
        console.log(`  ❌ Error fetching: ${error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Check complete');
}

checkPropane();
