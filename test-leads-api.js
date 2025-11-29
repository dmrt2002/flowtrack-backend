const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/workspaces/8592d2ed-1d31-46d7-9c65-99aecd0de8d4/leads?view=table',
  method: 'GET',
  headers: {
    'authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg4YjY2ZDJmZjhkNWNjODQwZjU5MTBkMjgwNTQxZTJhNjk1MzI1YjEiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiI3NTg4MTE0NjM5NzQtZzd0OGtyNXZlcmF2ZGM4dW9yOHAxZm01NWFpOWJlamIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI3NTg4MTE0NjM5NzQtZzd0OGtyNXZlcmF2ZGM4dW9yOHAxZm01NWFpOWJlamIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDk1MTk4MzE3MTE0NDIyOTgzODAiLCJlbWFpbCI6ImRldmVuZHJhcmFuYXdhcmU5MjBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTczMjg3NTE5MiwibmFtZSI6IkRldmVuZHJhIFJhbmF3YXJlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lTb3pXREQtQ09FaGNuVTZfb1NhaHRTVXFZNlFLNzFCZ1Jtb0tQUnp3djhJeXRrbmc9czk2LWMiLCJnaXZlbl9uYW1lIjoiRGV2ZW5kcmEiLCJmYW1pbHlfbmFtZSI6IlJhbmF3YXJlIiwiaWF0IjoxNzMyODc1NDkyLCJleHAiOjE3MzI4NzkwOTIsImp0aSI6IjI5ZGYyMjQwMDM1MDUzNTY2MDJmYjliNGE1YTFhNTI0NTBlNjQzNTUifQ.V6S32KaRFO-bMMqopXHzwC32hqpf6B-o1UfAGGJePMdoQ8KQg3jYeHBKwP_9qTBdvjRU7jYwEoM_0YH81JQSMmLpU8GaYnvdAKJ3RqRBKTDEUbnvQxj5uYbU-9LCtKfD2TDxNlvwT5l4OBAO2PpqNcVTzF62qO4B-MHoS9iBEQk5mBGYrohvhEWHf8qqP0KGYG0PJp0KBEV68Nd7YSIcvwMfZcNyMzQd5N_KfnWD5-iCOubH9a6_w5Y-wWDbwzw1qrG1WxK3cYvuFGTzX4Vx2A_iqjNy97YjAJP1Sm3vqX3tNvd_7lRb8gPaFRsjLuC__g90sJu0e15ZlXh8SKcDvA'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
