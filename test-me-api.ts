import request from 'axios';

async function testMeAPI() {
  try {
    const response = await request.get('http://localhost:4000/api/v1/auth/me', {
      headers: {
        Cookie: 'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZjkwNjUwYS1lMGNmLTQ2YTYtODVlYS00NDRmMTg1ZmU0ZjYiLCJlbWFpbCI6ImRtcnR1c2hhckBnbWFpbC5jb20iLCJpYXQiOjE3NjQ0ODgxODQsImV4cCI6MTc2NDUwOTc4NH0.urOZvinzchH9VMHfbpeh48hP8w0BIzGWfjtpAJckQQA'
      }
    });
    
    console.log('Response from /me API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n\nPublic Form URL:');
    console.log(response.data.publicFormUrl || 'NOT FOUND');
    
  } catch (error: any) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testMeAPI();
