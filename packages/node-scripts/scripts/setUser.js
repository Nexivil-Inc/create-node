const { setAuth } = require('../utils/credentials');

async function SetUser() {
  await setAuth();
}
SetUser();
