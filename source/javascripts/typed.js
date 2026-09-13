// The hero only exists on the home page; case-study pages have no #hero-name.
if (document.getElementById("hero-name") && window.Typed) {
  var typed = new Typed('#hero-name', {
    strings: ["Welcome to GISA's Portfolio!"],
    typeSpeed: 50,
    loop: false
  });
}
