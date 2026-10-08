// The hero only exists on the home page; case-study pages have no #hero-name.
// The text comes from hero.greeting in data/ui.yml (data/ja/ui.yml in Japanese).
var heroName = document.getElementById("hero-name");
if (heroName && window.Typed) {
  var typed = new Typed('#hero-name', {
    strings: [heroName.getAttribute("data-typed-text")],
    typeSpeed: 50,
    loop: false
  });
}
