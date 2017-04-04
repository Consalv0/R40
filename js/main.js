/* eslint space-infix-ops: 0, space-before-function-paren: 0, indent: 0 */
/* global $ */

var navbarHeight = $('nav').outerHeight()
$('html, body').css({
  overflow: 'hidden',
  height: '100%'
})
$(document).on('click', 'a.smooth', function (e) {
  e.preventDefault()
  var $link = $(this)
  var anchor = $link.attr('href')
  if ($(anchor).outerHeight(true) <= $(window).height() - navbarHeight / 2) {
    $('html, body').stop().animate({
      scrollTop: (($(window).height() + $(anchor).outerHeight(true)) / 2) - $(window).height() + $(anchor).position().top - navbarHeight/2
    }, 1000)
  } else {
      $('html, body').stop().animate({
        scrollTop: $(anchor).position().top - navbarHeight
      }, 1000)
  }
})
