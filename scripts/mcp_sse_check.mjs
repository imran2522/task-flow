import https from 'https';

const url = 'https://task-flow-api-cvw6.onrender.com/mcp';
console.log(`Connecting to ${url}`);

const req = https.get(url, { headers: { Accept: 'text/event-stream' } }, (res) => {
  console.log('Status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
  if (res.statusCode !== 200) {
    console.error('Non-200 status, aborting');
    process.exit(1);
  }

  res.setEncoding('utf8');
  let buffer = '';
  res.on('data', (chunk) => {
    buffer += chunk;
    let parts = buffer.split(/\r?\n/);
    buffer = parts.pop();
    for (const line of parts) {
      if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        try {
          const parsed = JSON.parse(data);
          console.log('EVENT JSON:', JSON.stringify(parsed));
        } catch {
          console.log('EVENT:', data);
        }
      } else if (line.startsWith(':')) {
        // comment ping
      } else if (line === '') {
        // event boundary
      } else {
        console.log('LINE:', line);
      }
    }
  });

  res.on('end', () => {
    console.log('Connection closed by server');
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

// Safety timeout
setTimeout(() => {
  console.log('Timeout reached, aborting connection');
  req.abort();
  process.exit(0);
}, 20000);
