const { readdirSync } = require('fs-extra');
const { join } = require('path/posix');
const nameRegex = new RegExp(/^([^.]+)\.(js|ts|jsx|tsx)$/);
function getFileList(rootDir, childDir = '', files = {}) {
  const joinedDirPath = join(rootDir, childDir);

  const items = readdirSync(joinedDirPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      getFileList(rootDir, join(childDir, item.name), files);
    } else {
      const filename = nameRegex.exec(item.name);
      if (filename)
        files[join(childDir, filename[1])] = join(joinedDirPath, filename[1]);
    }
  }

  return files;
}

module.exports = getFileList;
