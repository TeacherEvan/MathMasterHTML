const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test-results.competition.json'));
data.suites.forEach(s => {
  s.specs.forEach(spec => {
    spec.tests.forEach(t => {
      t.results.forEach(r => {
        if (r.status === 'failed') console.log(s.title + ' > ' + spec.title);
      });
    });
  });
});
