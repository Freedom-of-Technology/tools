// The page: the Print button, which opens the browser's own print window. The page's print styles
// (style.css) fit it onto one Letter page. Without scripts the button stays hidden, and the browser's
// own Print still works.

const print = document.getElementById("print");
print.hidden = false;
print.addEventListener("click", () => window.print());
