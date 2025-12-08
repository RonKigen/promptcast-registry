// PromptCast Selector Discovery Tool
// Copy-paste this into the browser console on any AI platform page

console.log('🔍 PromptCast Selector Discovery\n');

// Find input elements
console.log('=== INPUT ELEMENTS ===');
const inputs = [
  ...document.querySelectorAll('textarea'),
  ...document.querySelectorAll('input[type="text"]'),
  ...document.querySelectorAll('[contenteditable="true"]')
];

inputs.forEach((el, i) => {
  if (el.offsetParent !== null) { // Visible only
    console.log(`\n${i + 1}. ${el.tagName}`);
    console.log('   ID:', el.id || '(none)');
    console.log('   Classes:', el.className || '(none)');
    console.log('   Placeholder:', el.placeholder || el.getAttribute('placeholder') || '(none)');
    console.log('   Role:', el.getAttribute('role') || '(none)');
    console.log('   Data attrs:', Array.from(el.attributes)
      .filter(a => a.name.startsWith('data-'))
      .map(a => `${a.name}="${a.value}"`)
      .join(', ') || '(none)');
    
    // Generate selector
    let selector = el.tagName.toLowerCase();
    if (el.id) selector = `#${el.id}`;
    else if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        selector += `.${classes[0]}`;
      }
    }
    console.log('   Suggested selector:', selector);
  }
});

// Find buttons
console.log('\n\n=== SEND BUTTONS ===');
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, i) => {
  if (btn.offsetParent !== null) { // Visible only
    const text = btn.textContent.trim();
    const ariaLabel = btn.getAttribute('aria-label');
    const testId = btn.getAttribute('data-testid');
    
    if (text.length < 50 && (
      text.toLowerCase().includes('send') ||
      text.toLowerCase().includes('submit') ||
      text.toLowerCase().includes('发送') ||
      ariaLabel?.toLowerCase().includes('send') ||
      btn.type === 'submit'
    )) {
      console.log(`\n${i + 1}. Button`);
      console.log('   Text:', text || '(empty)');
      console.log('   Aria-label:', ariaLabel || '(none)');
      console.log('   Data-testid:', testId || '(none)');
      console.log('   Type:', btn.type || '(none)');
      console.log('   Classes:', btn.className || '(none)');
      
      // Generate selector
      let selector = 'button';
      if (testId) selector = `button[data-testid="${testId}"]`;
      else if (ariaLabel) selector = `button[aria-label="${ariaLabel}"]`;
      else if (btn.type === 'submit') selector = `button[type="submit"]`;
      
      console.log('   Suggested selector:', selector);
    }
  }
});

console.log('\n\n✅ Discovery complete! Copy the suggested selectors above.');
