const fs = require('fs');
try {
const data2 = JSON.parse(fs.readFileSync('test-results.json'));
data2.suites.forEach(suite => {
  const extractSpecs = (s) => {
    s.specs.forEach(spec => {
      spec.tests.forEach(t => {
        t.results.forEach(r => {
          if (r.status === 'failed' || r.status === 'timedOut') console.log('DEFAULT: '+s.title+' > '+spec.title);
        });
      });
    });
    if (s.suites) s.suites.forEach(extractSpecs);
  };
  extractSpecs(suite);
});
} catch(e) {}
