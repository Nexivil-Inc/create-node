'use strict';
// DESIGN EXPRESS credentials of `setUser` / `publish`, kept in the OS keychain (Windows Credential Manager, macOS
// Keychain, Linux Secret Service) through @napi-rs/keyring (prebuilt binaries, no install script).
// node-scripts < 3.0 used keytar: its entries are migrated on first use (see readKeytarWindows / legacy lookups).

const { Entry, findCredentials } = require('@napi-rs/keyring');
const { spawnSync } = require('child_process');
const readline = require('readline');
const chalk = require('./colors');

const isLocalhost = process.env.localhost?.trim().toLowerCase() === 'true';
const service =
  process.env.NODE_SCRIPTS_CREDENTIAL_SERVICE || // tests only
  (isLocalhost ? 'nexivil/design-express/v1/preview' : 'nexivil/design-express/v1');

function ask(question, { muted = false } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.stdoutMuted = false;
    rl._writeToOutput = text => rl.output.write(rl.stdoutMuted ? '*' : text);
    rl.question(chalk.blueBright(question), answer => {
      rl.close();
      if (muted) process.stdout.write('\n');
      resolve(answer.trim());
    });
    rl.stdoutMuted = muted;
  });
}

function saved() {
  try {
    return findCredentials(service);
  } catch {
    return [];
  }
}

/**
 * keytar (node-scripts < 3.0) on Windows: generic credentials named "<service>/<account>" with a UTF-8 secret, which
 * @napi-rs/keyring cannot decode (it expects UTF-16). Read them once with CredEnumerate through PowerShell.
 */
function readKeytarWindows() {
  if (process.platform !== 'win32') return [];
  const csharp = `
using System; using System.Runtime.InteropServices; using System.Text;
public static class NodeScriptsKeytar {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct CREDENTIAL { public int Flags; public int Type; public string TargetName; public string Comment; public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CredEnumerate(string filter, int flags, out int count, out IntPtr creds);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr p);
  public static string List(string filter) {
    int n; IntPtr arr; var sb = new StringBuilder();
    if (!CredEnumerate(filter, 0, out n, out arr)) return "";
    for (int i = 0; i < n; i++) {
      var c = (CREDENTIAL)Marshal.PtrToStructure(Marshal.ReadIntPtr(arr, i * IntPtr.Size), typeof(CREDENTIAL));
      byte[] b = new byte[c.CredentialBlobSize]; if (c.CredentialBlobSize > 0) Marshal.Copy(c.CredentialBlob, b, 0, b.Length);
      sb.Append(Convert.ToBase64String(Encoding.UTF8.GetBytes(c.TargetName ?? ""))).Append(' ')
        .Append(Convert.ToBase64String(Encoding.UTF8.GetBytes(c.UserName ?? ""))).Append(' ').Append(Convert.ToBase64String(b)).Append('\\n');
    }
    CredFree(arr); return sb.ToString();
  }
}`;
  const script = `Add-Type -TypeDefinition @'\n${csharp}\n'@; [NodeScriptsKeytar]::List('${service}/*')`;
  const out = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true });
  if (out.status !== 0 || !out.stdout) return [];
  return out.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const [target, account, password] = line.split(' ').map(x => Buffer.from(x || '', 'base64').toString('utf8'));
      return { target, account, password };
    })
    // exactly "<service>/<account>" (the wildcard also matches nested services such as …/v1/preview/<account>)
    .filter(c => c.account && c.password && c.target === `${service}/${c.account}`)
    .map(({ account, password }) => ({ account, password }));
}

/** Saved credentials, migrating keytar entries of node-scripts < 3.0 into the current store once. */
function credentials() {
  let list = saved();
  if (list.length) return list;
  const legacy = readKeytarWindows();
  for (const { account, password } of legacy) {
    try {
      new Entry(service, account).setPassword(password);
    } catch {
      /* keep using the legacy value for this run */
    }
  }
  if (legacy.length) console.log(chalk.green(`Migrated ${legacy.length} saved DESIGN EXPRESS credential(s) to the new keychain store.`));
  list = saved();
  return list.length ? list : legacy;
}

async function setAuth() {
  const user = await ask('Email: ');
  const token = await ask('Access Token: ', { muted: true });
  if (!user || !token) {
    console.log(chalk.red('Email and access token are required.'));
    process.exitCode = 1;
    return;
  }
  new Entry(service, user).setPassword(token);
  console.log(chalk.green(`Saved the credential of ${user} in the OS keychain.`));
}

async function getAuth() {
  const list = credentials();
  if (!list.length) {
    console.log(chalk.redBright('No saved DESIGN EXPRESS credential.'));
    console.log(chalk.blueBright('Run: npm run setuser   (or npx @design-express/node-scripts setUser)\n'));
    return undefined;
  }
  if (list.length === 1) return { user: list[0].account, token: list[0].password };
  console.log(chalk.blueBright('We found multiple saved accounts:'));
  for (const c of list) console.log(`  ${c.account}`);
  const user = await ask('Email: ');
  const found = list.find(c => c.account === user);
  if (!found) {
    console.log(chalk.redBright(`No saved credential for ${user}.`));
    console.log(chalk.blueBright('Run: npm run setuser\n'));
    return undefined;
  }
  return { user, token: found.password };
}

module.exports = { getAuth, setAuth, credentials, service };
