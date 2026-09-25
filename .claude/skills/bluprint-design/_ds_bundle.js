/* @ds-bundle: {"format":4,"namespace":"BluPrintDesignSystem_d4fa62","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"CardTitle","sourcePath":"components/core/Card.jsx"},{"name":"CardDescription","sourcePath":"components/core/Card.jsx"},{"name":"CardContent","sourcePath":"components/core/Card.jsx"},{"name":"CardFooter","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Toaster","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"SegmentedControl","sourcePath":"components/navigation/SegmentedControl.jsx"},{"name":"DropdownMenu","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"DropdownMenuItem","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"DropdownMenuLabel","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"DropdownMenuSeparator","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"Sheet","sourcePath":"components/overlay/Sheet.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"fe667f6b47d1","components/core/Avatar.jsx":"3d7108569934","components/core/Badge.jsx":"04e0c76ce005","components/core/Button.jsx":"35515bb15167","components/core/Card.jsx":"77b0a85aa121","components/core/Icon.jsx":"f7f1fd8ada07","components/feedback/Alert.jsx":"7b881d675d2e","components/feedback/Skeleton.jsx":"bc0c8035ba33","components/feedback/Spinner.jsx":"f487984cabe4","components/feedback/Toast.jsx":"a37191e5f455","components/forms/Checkbox.jsx":"772c9a861f74","components/forms/Field.jsx":"ce08676a3c7a","components/forms/Input.jsx":"09a4bcb10891","components/forms/Label.jsx":"887ef842b370","components/forms/SearchInput.jsx":"c23ab0d4d2c7","components/navigation/Pagination.jsx":"9e2f9a91b056","components/navigation/SegmentedControl.jsx":"9add88646477","components/overlay/DropdownMenu.jsx":"99341defe251","components/overlay/Sheet.jsx":"0af711b30beb"},"inlinedExternals":[],"unexposedExports":[{"name":"initialsOf","sourcePath":"components/core/Avatar.jsx"},{"name":"pageItems","sourcePath":"components/navigation/Pagination.jsx"}]} */

(() => {

const __ds_ns = (window.BluPrintDesignSystem_d4fa62 = window.BluPrintDesignSystem_d4fa62 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// The logo art, embedded so it travels with the bundle. Source files: assets/logo-*.svg.
const ART = {
  "logo-mark": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 423 644\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"c\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"fold\" x1=\".2\" y1=\"0\" x2=\".8\" y2=\".7\"><stop offset=\"0\" stop-color=\"#0733A8\" stop-opacity=\".75\"></stop><stop offset=\"1\" stop-color=\"#0733A8\" stop-opacity=\"0\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g mask=\"url(#c)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"url(#g)\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"url(#g)\"></path></g><g mask=\"url(#c)\"><path d=\"M8,286 C52,398 132,462 214,452 L176,506 C84,498 14,414 -8,330 Z\" fill=\"url(#glow)\"></path><path d=\"M116,20 C214,104 258,224 242,318 L118,344 C124,222 88,120 26,62 Z\" fill=\"url(#fold)\"></path></g></svg>",
  "logo-mark-blue": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 423 644\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"c\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask></defs><g mask=\"url(#c)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#0068F0\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#0068F0\"></path></g></svg>",
  "logo-mark-white": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 423 644\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"c\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask></defs><g mask=\"url(#c)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#FFFFFF\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#FFFFFF\"></path></g></svg>",
  "logo-mark-ink": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 423 644\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"c\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask></defs><g mask=\"url(#c)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#081830\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#081830\"></path></g></svg>",
  "logo-lockup": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1162 320\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"scale(0.49689)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"url(#g)\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"url(#g)\"></path><path d=\"M8,286 C52,398 132,462 214,452 L176,506 C84,498 14,414 -8,330 Z\" fill=\"url(#glow)\"></path></g></g><g transform=\"translate(266,0)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#0068F0\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#081830\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#081830\"></circle></g></svg>",
  "logo-lockup-blue": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1162 320\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"scale(0.49689)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#0068F0\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#0068F0\"></path></g></g><g transform=\"translate(266,0)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#0068F0\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#0068F0\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#0068F0\"></circle></g></svg>",
  "logo-lockup-white": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1162 320\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"scale(0.49689)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#FFFFFF\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#FFFFFF\"></path></g></g><g transform=\"translate(266,0)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#FFFFFF\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#FFFFFF\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#FFFFFF\"></circle></g></svg>",
  "logo-lockup-ink": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1162 320\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"scale(0.49689)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#081830\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#081830\"></path></g></g><g transform=\"translate(266,0)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#081830\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#081830\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#081830\"></circle></g></svg>",
  "logo-stacked": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 896 1050\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"translate(236.5,0)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"url(#g)\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"url(#g)\"></path><path d=\"M8,286 C52,398 132,462 214,452 L176,506 C84,498 14,414 -8,330 Z\" fill=\"url(#glow)\"></path></g></g><g transform=\"translate(0,730)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#0068F0\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#081830\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#081830\"></circle></g></svg>",
  "logo-stacked-white": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 896 1050\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"translate(236.5,0)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#FFFFFF\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#FFFFFF\"></path></g></g><g transform=\"translate(0,730)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#FFFFFF\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#FFFFFF\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#FFFFFF\"></circle></g></svg>",
  "logo-stacked-ink": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 896 1050\" role=\"img\" aria-label=\"BluPrint\"><title>BluPrint</title><defs><mask id=\"mk\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"423\" height=\"644\"><rect width=\"423\" height=\"644\" fill=\"#fff\"></rect><circle cx=\"211\" cy=\"322\" r=\"103\" fill=\"#000\"></circle></mask><clipPath id=\"rArm\"><rect x=\"500\" y=\"100\" width=\"109\" height=\"120\"></rect></clipPath><linearGradient id=\"g\" x1=\".05\" y1=\"0\" x2=\".9\" y2=\"1\"><stop offset=\"0\" stop-color=\"#0A92FF\"></stop><stop offset=\".4\" stop-color=\"#0068F0\"></stop><stop offset=\"1\" stop-color=\"#0034DC\"></stop></linearGradient><linearGradient id=\"glow\" x1=\"0\" y1=\"1\" x2=\".7\" y2=\"0\"><stop offset=\"0\" stop-color=\"#29B6FF\" stop-opacity=\".8\"></stop><stop offset=\"1\" stop-color=\"#29B6FF\" stop-opacity=\"0\"></stop></linearGradient></defs><g transform=\"translate(236.5,0)\"><g mask=\"url(#mk)\"><path d=\"M116,16 A16,16 0 0 0 100,0 C36,0 0,46 0,120 L0,340 L116,340 Z\" fill=\"#081830\"></path><path d=\"M51.5,461.6 A212,212 0 1 1 370.5,461.6 L219,637 Q211,647 203,637 Z\" fill=\"#081830\"></path></g></g><g transform=\"translate(0,730)\"><g fill=\"none\" stroke-width=\"42\" stroke-linecap=\"butt\"><g stroke=\"#081830\"><path d=\"M21,75 V191\"></path><circle cx=\"76\" cy=\"191\" r=\"54\"></circle><path d=\"M182,75 V210 A34,34 0 0 0 216,244 H226\"></path><path d=\"M247,119 V196 A48,48 0 0 0 343,196 V119\"></path></g><g stroke=\"#081830\"><path d=\"M396,119 V316\"></path><circle cx=\"450\" cy=\"191\" r=\"54\"></circle><path d=\"M551,265 V173\"></path><path d=\"M551,173 A32.5,32.5 0 0 1 616,173\" clip-path=\"url(#rArm)\"></path><path d=\"M641,119 V265\"></path><path d=\"M694,265 V185 A45,45 0 0 1 784,185 V265\"></path><path d=\"M832.5,75 V194 A50,50 0 0 0 882.5,244 H895\"></path><path d=\"M812,140 H895\"></path></g></g><circle cx=\"641.5\" cy=\"93.5\" r=\"21.5\" fill=\"#081830\"></circle></g></svg>"
};
const MARK = {
  gradient: "logo-mark",
  blue: "logo-mark-blue",
  white: "logo-mark-white",
  ink: "logo-mark-ink"
};
const LOCKUP = {
  gradient: "logo-lockup",
  blue: "logo-lockup-blue",
  white: "logo-lockup-white",
  ink: "logo-lockup-ink"
};
const STACKED = {
  gradient: "logo-stacked",
  blue: "logo-stacked",
  white: "logo-stacked-white",
  ink: "logo-stacked-ink"
};
function Logo({
  tone = "gradient",
  size = 40,
  wordmark = false,
  stacked = false,
  basePath,
  className = "",
  style = {},
  ...rest
}) {
  const set = stacked ? STACKED : wordmark ? LOCKUP : MARK;
  const key = set[tone] || set.gradient;
  const src = basePath ? `${basePath}/${key}.svg` : `data:image/svg+xml;utf8,${encodeURIComponent(ART[key])}`;
  // Stacked art scales from the mark's height; the lockup's viewBox is already mark-height tall.
  const height = stacked ? size * 1.63 : size;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-logo ${className}`,
    style: style
  }, rest), /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "BluPrint",
    style: {
      height,
      width: "auto"
    }
  }));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Initials from a full name: first and last word. "Guilherme Lopes da Silva" -> "GS". */
function initialsOf(name = "") {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  return ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}
function Avatar({
  name = "",
  src = null,
  size = "md",
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-avatar bp-avatar--${size} ${className}`,
    "aria-hidden": "true"
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: ""
  }) : initialsOf(name));
}
Object.assign(__ds_scope, { initialsOf, Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  tone = "neutral",
  dot = false,
  icon = null,
  count = false,
  className = "",
  children,
  ...rest
}) {
  const cls = ["bp-badge", `bp-badge--${tone}`, count ? "bp-badge--count" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "bp-badge__dot",
    "aria-hidden": "true"
  }) : icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: "bp-btn--sm",
  md: "bp-btn--md",
  lg: "bp-btn--lg",
  icon: "bp-btn--icon",
  "icon-sm": "bp-btn--icon-sm"
};
function Button({
  variant = "default",
  size = "md",
  block = false,
  loading = false,
  iconStart = null,
  iconEnd = null,
  as = "button",
  className = "",
  children,
  ...rest
}) {
  const Comp = as;
  const cls = ["bp-btn", `bp-btn--${variant}`, SIZES[size] || SIZES.md, block ? "bp-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement(Comp, _extends({
    className: cls,
    "data-variant": variant,
    "data-size": size,
    disabled: rest.disabled || loading,
    "aria-busy": loading || undefined
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "bp-spinner",
    style: {
      width: "1.15em",
      height: "1.15em"
    },
    "aria-hidden": "true"
  }) : iconStart, children, iconEnd);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  size = "default",
  raised = false,
  className = "",
  children,
  ...rest
}) {
  const cls = ["bp-card", size === "sm" ? "bp-card--sm" : "", raised ? "bp-card--raised" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    "data-size": size
  }, rest), children);
}
function CardHeader({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__header ${className}`
  }, rest), children);
}
function CardTitle({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__title ${className}`
  }, rest), children);
}
function CardDescription({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__desc ${className}`
  }, rest), children);
}
function CardContent({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__content ${className}`
  }, rest), children);
}
function CardFooter({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-card__footer ${className}`
  }, rest), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// The lucide glyphs, embedded so the icon travels with the bundle. Source files: assets/icons/*.svg.
const GLYPHS = {
  "arrow-left": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 19-7-7 7-7\"></path><path d=\"M19 12H5\"></path></svg>",
  "building": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 10h.01\"></path><path d=\"M12 14h.01\"></path><path d=\"M12 6h.01\"></path><path d=\"M16 10h.01\"></path><path d=\"M16 14h.01\"></path><path d=\"M16 6h.01\"></path><path d=\"M8 10h.01\"></path><path d=\"M8 14h.01\"></path><path d=\"M8 6h.01\"></path><path d=\"M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\"></path><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"></rect></svg>",
  "check": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"></path></svg>",
  "chevron-down": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m6 9 6 6 6-6\"></path></svg>",
  "chevron-left": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m15 18-6-6 6-6\"></path></svg>",
  "chevron-right": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"></path></svg>",
  "circle-alert": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"></line><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"></line></svg>",
  "circle-check": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"m16 9-5.5 5.5L8 12\"></path></svg>",
  "eye-off": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"></path><path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"></path><path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"></path><path d=\"m2 2 20 20\"></path></svg>",
  "eye": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg>",
  "hard-hat": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5\"></path><path d=\"M14 6a6 6 0 0 1 6 6v3\"></path><path d=\"M4 15v-3a6 6 0 0 1 6-6\"></path><rect x=\"2\" y=\"15\" width=\"20\" height=\"4\" rx=\"1\"></rect></svg>",
  "lock": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path></svg>",
  "log-out": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m16 17 5-5-5-5\"></path><path d=\"M21 12H9\"></path><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"></path></svg>",
  "mail": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\"></path><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"></rect></svg>",
  "map-pin": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"></path><circle cx=\"12\" cy=\"10\" r=\"3\"></circle></svg>",
  "moon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"></path></svg>",
  "plus": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14\"></path><path d=\"M12 5v14\"></path></svg>",
  "refresh-cw": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"></path><path d=\"M21 3v5h-5\"></path><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"></path><path d=\"M8 16H3v5\"></path></svg>",
  "search": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"8\"></circle><path d=\"m21 21-4.34-4.34\"></path></svg>",
  "sliders-horizontal": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 5H3\"></path><path d=\"M12 19H3\"></path><path d=\"M14 3v4\"></path><path d=\"M16 17v4\"></path><path d=\"M21 12h-9\"></path><path d=\"M21 19h-5\"></path><path d=\"M21 5h-7\"></path><path d=\"M8 10v4\"></path><path d=\"M8 12H3\"></path></svg>",
  "sun": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4\"></circle><path d=\"M12 2v2\"></path><path d=\"M12 20v2\"></path><path d=\"m4.93 4.93 1.41 1.41\"></path><path d=\"m17.66 17.66 1.41 1.41\"></path><path d=\"M2 12h2\"></path><path d=\"M20 12h2\"></path><path d=\"m6.34 17.66-1.41 1.41\"></path><path d=\"m19.07 4.93-1.41 1.41\"></path></svg>",
  "user": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle></svg>",
  "wifi-off": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 20h.01\"></path><path d=\"M8.5 16.429a5 5 0 0 1 7 0\"></path><path d=\"M5 12.859a10 10 0 0 1 5.17-2.69\"></path><path d=\"M19 12.859a10 10 0 0 0-2.007-1.523\"></path><path d=\"M2 8.82a15 15 0 0 1 4.177-2.643\"></path><path d=\"M22 8.82a15 15 0 0 0-11.288-3.764\"></path><path d=\"m2 2 20 20\"></path></svg>",
  "x": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 6 6 18\"></path><path d=\"m6 6 12 12\"></path></svg>"
};
const uri = svg => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Lucide glyph rendered as a mask, so it inherits currentColor like lucide-react does in the app. */
function Icon({
  name,
  size = 20,
  basePath,
  className = "",
  style = {},
  ...rest
}) {
  const url = basePath ? `url("${basePath}/${name}.svg")` : GLYPHS[name] ? uri(GLYPHS[name]) : "none";
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    className: className,
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      background: "currentColor",
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONS = {
  danger: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h.01"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  })),
  success: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 12.5 2.5 2.5 4.5-5"
  }))
};
function Alert({
  tone = "danger",
  title,
  children,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-alert bp-alert--${tone} ${className}`,
    role: tone === "danger" ? "alert" : "status"
  }, rest), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, ICONS[tone]), /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("div", {
    className: "bp-alert__title"
  }, title) : null, children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Skeleton({
  width = "100%",
  height = 16,
  radius = "md",
  circle = false,
  className = "",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-skeleton ${className}`,
    "aria-hidden": "true",
    style: {
      width: circle ? height : width,
      height,
      borderRadius: circle ? "var(--radius-full)" : `var(--radius-${radius})`,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Spinner({
  size = 20,
  label = "Carregando…",
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `bp-spinner ${className}`,
    style: {
      width: size,
      height: size
    },
    role: "status",
    "aria-label": label
  }, rest));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPH = {
  danger: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h.01"
  })),
  success: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 12.5 2.5 2.5 4.5-5"
  })),
  default: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  }))
};

/** One transient message. In apps/web this is sonner's toast(); this is its look. */
function Toast({
  tone = "default",
  title,
  action = null,
  onDismiss,
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-toast bp-toast--${tone} ${className}`,
    role: tone === "danger" ? "alert" : "status"
  }, rest), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className: "bp-toast__icon"
  }, GLYPH[tone] || GLYPH.default), /*#__PURE__*/React.createElement("div", {
    className: "bp-toast__body"
  }, title ? /*#__PURE__*/React.createElement("div", {
    className: "bp-toast__title"
  }, title) : null, children), action, onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bp-toast__close",
    "aria-label": "Fechar aviso",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  }))) : null);
}

/** Stack that holds toasts. `offset` lifts it above a fixed bottom bar. `contained` pins it to the parent box. */
function Toaster({
  position = "bottom-center",
  offset = 0,
  contained = false,
  className = "",
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `bp-toaster bp-toaster--${position} ${contained ? "bp-toaster--contained" : ""} ${className}`,
    style: {
      "--toaster-offset": typeof offset === "number" ? offset + "px" : offset
    },
    "aria-live": "polite"
  }, children);
}
Object.assign(__ds_scope, { Toast, Toaster });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  description,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: `bp-checkbox ${className}`
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, rest)), /*#__PURE__*/React.createElement("span", null, label, description ? /*#__PURE__*/React.createElement("span", {
    className: "bp-hint",
    style: {
      display: "block"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  invalid = false,
  affix = null,
  className = "",
  ...rest
}) {
  const input = /*#__PURE__*/React.createElement("input", _extends({
    className: ["bp-input", invalid ? "bp-input--invalid" : "", affix ? "bp-input--with-affix" : "", className].filter(Boolean).join(" "),
    "aria-invalid": invalid || undefined
  }, rest));
  if (!affix) return input;
  return /*#__PURE__*/React.createElement("span", {
    className: "bp-input-wrap"
  }, input, /*#__PURE__*/React.createElement("span", {
    className: "bp-input-affix"
  }, affix));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Label({
  optional = false,
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    className: `bp-label ${className}`
  }, rest), children, optional ? /*#__PURE__*/React.createElement("span", {
    className: "bp-label__optional"
  }, " (opcional)") : null);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  htmlFor,
  optional = false,
  hint,
  error,
  children,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-field ${className}`
  }, rest), label ? /*#__PURE__*/React.createElement(__ds_scope.Label, {
    htmlFor: htmlFor,
    optional: optional
  }, label) : null, children, hint && !error ? /*#__PURE__*/React.createElement("span", {
    className: "bp-hint"
  }, hint) : null, error ? /*#__PURE__*/React.createElement("span", {
    className: "bp-error",
    role: "alert"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h.01"
  })), error) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SearchInput({
  value = "",
  onChange,
  onClear,
  placeholder = "Buscar",
  size = "md",
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `bp-search bp-search--${size} ${className}`
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className: "bp-search__icon"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.34-4.34"
  })), /*#__PURE__*/React.createElement("input", _extends({
    type: "search",
    className: "bp-input bp-search__input",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    enterKeyHint: "search",
    autoComplete: "off"
  }, rest)), value ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bp-search__clear",
    "aria-label": "Limpar busca",
    onClick: onClear
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  }))) : null);
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
/** 1 … 4 5 6 … 12 — at most 7 slots, first and last always shown. */
function pageItems(page, count) {
  if (count <= 7) return Array.from({
    length: count
  }, (_, i) => i + 1);
  const out = [1];
  let a = Math.max(2, page - 1),
    b = Math.min(count - 1, page + 1);
  if (page <= 3) {
    a = 2;
    b = 5;
  }
  if (page >= count - 2) {
    a = count - 4;
    b = count - 1;
  }
  if (a > 2) out.push("…");
  for (let i = a; i <= b; i++) out.push(i);
  if (b < count - 1) out.push("…");
  out.push(count);
  return out;
}
const Chev = ({
  d
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: d
}));
function Pagination({
  page,
  pageCount,
  onPageChange,
  loadingPage = null,
  label = "Paginação",
  className = ""
}) {
  const busy = loadingPage != null;
  const shown = busy ? loadingPage : page;
  const go = p => {
    if (onPageChange && p !== page) onPageChange(p);
  };
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": label,
    className: `bp-pagination ${className}`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bp-pagination__page bp-pagination__step",
    disabled: busy || page <= 1,
    onClick: () => go(page - 1)
  }, /*#__PURE__*/React.createElement(Chev, {
    d: "m15 18-6-6 6-6"
  }), "Anterior"), pageItems(shown, pageCount).map((p, i) => p === "…" ? /*#__PURE__*/React.createElement("span", {
    key: "e" + i,
    className: "bp-pagination__ellipsis",
    "aria-hidden": "true"
  }, "\u2026") : /*#__PURE__*/React.createElement("button", {
    key: p,
    type: "button",
    className: "bp-pagination__page",
    "aria-current": p === shown ? "page" : undefined,
    "aria-label": `Página ${p}`,
    "aria-busy": busy && p === loadingPage ? true : undefined,
    disabled: busy,
    onClick: () => go(p)
  }, busy && p === loadingPage ? /*#__PURE__*/React.createElement("span", {
    className: "bp-spinner",
    style: {
      width: 14,
      height: 14
    },
    "aria-hidden": "true"
  }) : p)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bp-pagination__page bp-pagination__step",
    disabled: busy || page >= pageCount,
    onClick: () => go(page + 1)
  }, "Pr\xF3xima", /*#__PURE__*/React.createElement(Chev, {
    d: "m9 18 6-6-6-6"
  })));
}
Object.assign(__ds_scope, { pageItems, Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  block = false,
  label,
  className = ""
}) {
  const cls = ["bp-seg", `bp-seg--${size}`, block ? "bp-seg--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": label,
    className: cls
  }, options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value,
    "aria-label": o.ariaLabel,
    className: "bp-seg__item",
    onClick: () => onChange && onChange(o.value)
  }, o.icon || null, o.label)));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/overlay/DropdownMenu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MenuCtx = React.createContext({
  close: () => {},
  locked: false
});
function DropdownMenu({
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  align = "end",
  locked = false,
  width = 264,
  label,
  className = "",
  children
}) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp !== undefined ? openProp : inner;
  const ref = React.useRef(null);
  const set = React.useCallback(v => {
    if (locked && !v) return; // a locked menu (e.g. signing out) cannot be dismissed
    if (openProp === undefined) setInner(v);
    if (onOpenChange) onOpenChange(v);
  }, [locked, openProp, onOpenChange]);
  React.useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) set(false);
    };
    const onKey = e => {
      if (e.key === "Escape") set(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, set]);
  const t = React.cloneElement(trigger, {
    onClick: e => {
      if (trigger.props.onClick) trigger.props.onClick(e);
      set(!open);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open
  });
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: `bp-menu-root ${className}`
  }, t, open ? /*#__PURE__*/React.createElement("div", {
    role: "menu",
    "aria-label": label,
    "aria-busy": locked || undefined,
    className: `bp-menu bp-menu--${align}`,
    style: {
      width
    }
  }, /*#__PURE__*/React.createElement(MenuCtx.Provider, {
    value: {
      close: () => set(false),
      locked
    }
  }, children)) : null);
}
function DropdownMenuItem({
  icon = null,
  checked,
  disabled = false,
  loading = false,
  keepOpen = false,
  onSelect,
  className = "",
  children,
  ...rest
}) {
  const ctx = React.useContext(MenuCtx);
  const radio = checked !== undefined;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: radio ? "menuitemradio" : "menuitem",
    "aria-checked": radio ? checked : undefined,
    "aria-busy": loading || undefined,
    disabled: disabled || loading || ctx.locked && !loading,
    className: `bp-menu__item ${className}`,
    onClick: () => {
      if (onSelect) onSelect();
      if (!keepOpen) ctx.close();
    }
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "bp-spinner",
    style: {
      width: 18,
      height: 18
    },
    "aria-hidden": "true"
  }) : icon, /*#__PURE__*/React.createElement("span", {
    className: "bp-menu__item-label"
  }, children), radio && checked ? /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    className: "bp-menu__check"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })) : null);
}
function DropdownMenuLabel({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `bp-menu__label ${className}`
  }, rest), children);
}
function DropdownMenuSeparator() {
  return /*#__PURE__*/React.createElement("div", {
    className: "bp-menu__sep",
    role: "separator"
  });
}
Object.assign(__ds_scope, { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/DropdownMenu.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Sheet.jsx
try { (() => {
function Sheet({
  open,
  onClose,
  title,
  description,
  footer = null,
  contained = false,
  className = "",
  children
}) {
  const id = React.useId ? React.useId() : "bp-sheet";
  React.useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: `bp-sheet-root ${contained ? "bp-sheet-root--contained" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "bp-sheet__scrim",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": id + "-t",
    className: `bp-sheet ${className}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "bp-sheet__handle",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("header", {
    className: "bp-sheet__header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bp-sheet__heading"
  }, /*#__PURE__*/React.createElement("h2", {
    id: id + "-t",
    className: "bp-sheet__title"
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    className: "bp-sheet__desc"
  }, description) : null), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "bp-btn bp-btn--ghost bp-btn--icon",
    "aria-label": "Fechar",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bp-sheet__body"
  }, children), footer ? /*#__PURE__*/React.createElement("footer", {
    className: "bp-sheet__footer"
  }, footer) : null));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Sheet.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Toaster = __ds_scope.Toaster;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.DropdownMenu = __ds_scope.DropdownMenu;

__ds_ns.DropdownMenuItem = __ds_scope.DropdownMenuItem;

__ds_ns.DropdownMenuLabel = __ds_scope.DropdownMenuLabel;

__ds_ns.DropdownMenuSeparator = __ds_scope.DropdownMenuSeparator;

__ds_ns.Sheet = __ds_scope.Sheet;

})();
