const email = `otpcheck${Date.now()}@test.com`;

const first = await fetch('http://localhost:5000/api/auth/register-organization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationName: 'OTP Org',
    managerName: 'OTP Manager',
    managerEmail: email,
    managerPassword: 'abc12345'
  })
});

const firstJson = await first.json();
console.log('first', first.status, firstJson);

const second = await fetch('http://localhost:5000/api/auth/register-organization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationName: 'OTP Org',
    managerName: 'OTP Manager',
    managerEmail: email,
    managerPassword: 'abc12345',
    verificationCode: firstJson.verificationCode
  })
});

const secondText = await second.text();
console.log('second', second.status, secondText);
