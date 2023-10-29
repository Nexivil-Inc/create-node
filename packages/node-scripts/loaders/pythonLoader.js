module.exports = function loader(content, map, meta) {
  const callback = this.async();

  content = `async function pyexec(){
    if(!window.python) {
      console.error("Please Add Python node!");
      return
    }
    const python=await window.python;
    return await python.exec(${JSON.stringify(content)}, arguments);
}`;

  callback(null, `export default ${content}`, map, meta);
};
