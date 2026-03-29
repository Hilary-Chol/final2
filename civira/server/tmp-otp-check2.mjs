const now = Date.now();

const applicantEmail = `appotp${now}@test.com`;
const appFirst = await fetch('http://localhost:5000/api/applicants/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Applicant OTP',
    email: applicantEmail,
    phone: '12345',
    location: 'Test City'
  })
});
const appFirstJson = await appFirst.json();
const appSecond = await fetch('http://localhost:5000/api/applicants/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Applicant OTP',
    email: applicantEmail,
    phone: '12345',
    location: 'Test City',
    verificationCode: appFirstJson.verificationCode
  })
});
console.log('applicant', appFirst.status, appSecond.status);

const orgEmail = `orgotp${now}@test.com`;
const orgFirst = await fetch('http://localhost:5000/api/auth/register-organization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationName: 'Panelist Org',
    managerName: 'Org Manager',
    managerEmail: orgEmail,
    managerPassword: 'abc12345'
  })
});
const orgFirstJson = await orgFirst.json();
const orgSecond = await fetch('http://localhost:5000/api/auth/register-organization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationName: 'Panelist Org',
    managerName: 'Org Manager',
    managerEmail: orgEmail,
    managerPassword: 'abc12345',
    verificationCode: orgFirstJson.verificationCode
  })
});
const orgSecondJson = await orgSecond.json();

const pnlEmail = `pnlotp${now}@test.com`;
const pnlFirst = await fetch('http://localhost:5000/api/auth/panelists/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Panelist OTP',
    email: pnlEmail,
    password: 'abc12345',
    accountCode: orgSecondJson.accountCode
  })
});
const pnlFirstJson = await pnlFirst.json();
const pnlSecond = await fetch('http://localhost:5000/api/auth/panelists/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Panelist OTP',
    email: pnlEmail,
    password: 'abc12345',
    accountCode: orgSecondJson.accountCode,
    verificationCode: pnlFirstJson.verificationCode
  })
});
console.log('panelist', pnlFirst.status, pnlSecond.status);
