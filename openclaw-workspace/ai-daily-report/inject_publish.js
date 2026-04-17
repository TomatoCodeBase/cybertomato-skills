(function(){
  try {
    var allDivs = document.querySelectorAll('div');
    for(var i=0; i<allDivs.length; i++){
      var d = allDivs[i];
      if(d.innerText.trim() === '发布' && d.className.indexOf('btn') !== -1){
        d.click();
        return 'Clicked publish';
      }
    }
    return 'Publish button not found';
  } catch(e) { return 'Error: ' + e.message; }
})()