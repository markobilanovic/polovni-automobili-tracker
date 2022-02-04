Date.prototype.addHours = function(h) {
    this.setHours(this.getHours()+h);
    return this;
}
  
function getCurrentDate() {
    return new Date().addHours(1).toLocaleTimeString('en-US');
}

module.exports = {
    getCurrentDate: getCurrentDate,
}