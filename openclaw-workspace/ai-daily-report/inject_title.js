(function(){
  try {
    var inputs = document.querySelectorAll('input[type=text]');
    for(var i=0; i<inputs.length; i++){
      if(inputs[i].placeholder && inputs[i].placeholder.indexOf('标题') !== -1){
        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(inputs[i], "Snap\u780d\u5343\u4eba\u5582AI\uff0cMiniMax\u517b\u9a6c\u8fdb\u5316\uff1aAgent\u6218\u4e89\u6253\u5230\"\u5077\u4ee3\u7801\"\u4e86");
        inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
        return 'Title set: ' + inputs[i].value;
      }
    }
    return 'Title input not found';
  } catch(e) { return 'Error: ' + e.message; }
})()