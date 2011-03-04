/*
	
	Copyright 2011, Adam Drew
	
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in 
	compliance with the License.  You may obtain a copy of the License at 
	
		http://www.apache.org/licenses/LICENSE-2.0
	
	Unless required by applicable law or agreed to in writing, software distributed under the License is 
	distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or 
	implied.  See the License for the specific language governing permissions and limitations under the 
	License.
	
 */

// closure for plugin
(function($){

	Object.size = function(obj) {
		var size = 0, key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	};

	$.validatethis = {
		version: '0.99',
		vtCache: [], // todo implement exists|set|get|remove for cache
		conditions: [],

		// Settings
		settings: {},

		defaults: {
			debug:				false,
			initialized:		false,
			remoteEnabled:		false,
			baseURL: 			'',
			appMapping:			'',
			ajaxProxyURL:		'/remote/validatethisproxy.cfc?method=',
			ignoreClass:		".ignore",
			errorClass:			'ui-state-error'
		},

		result: {
			isSuccess:true,
			errors:[]
		},

		// validatethis client plugin setup
		init : function(options){
			if (!this.settings.initialized){
				this.session = {};
				
				this.log("plugin","initializing v" + this.version);

				// Log Options For Debugging
				this.log("plugin","options=" + $.param(options));

				var extendedDefaultOptions = $.extend({}, this.defaults, options);

				this.settings = extendedDefaultOptions;

				// See: : /validatethis/samples/colboxmoduledemo/remote/validatethisproxy.cfc
				this.remoteCall("getValidationVersion",{},this.getVersionCallback);
				$.validatethis.remoteCall("getInitializationScript",{setup:"methods"},
						function(data){
							$.validatethis.evalInitScript(data);
						}
				);
				
				this.setValidatorDefaults();
				this.settings.initialized = true;

			} else {
				this.log("plugin","initialized");
			}
		},

		setValidatorDefaults: function(){
			$.validator.setDefaults({
				submitHandler: 		$.validatethis.submitHandler,
				errorClass: $.validatethis.settings.errorClass,
				errorElement: 'span',
				errorPlacement: function(error, element) { error.appendTo( element.parent("div"))}
			});
		},

		clearFormRules: function(form){
			form.find(":input").each(function(input){
				$(input).rules("remove");
			});
		},

		remoteCall: function(action, arguments, callback){
			this.log("remote",action + " " + $.param(arguments));
			$.get(this.settings.ajaxProxyURL + action + "&" + $.param(arguments), callback);
		},

		submitHandler: function(form) {
			$.validatethis.log("validations","submitHandler for " + $(form).attr("name"));
			if ($.validatethis.settings.remoteEnabled){
				$(form).ajaxSubmit({success: function(element,data){
					$.validatethis.ajaxSubmitSuccessCallback(form,element);
				}});
			} else {
				form.submit();
			}
		},

		// Callback for A successful AJAX form submit
		ajaxSubmitSuccessCallback: function(form,data){
			$.validatethis.log("plugin", "Submit Success");
			$(form).html(data);
			$(form).parent().validatethis();
		},

		// Eval a ClientTest Condition
		testCondition: function(element){
			// return true by default
			var result = true;
			if ( $(element).data("depends") ){
				var key = $(element).data("depends");
				var formID = $(element).parents().find("form:first").attr("id");
				var clientTest= $.validatethis.conditions[formID][key];
				result = eval(clientTest);
				this.log("condition","Tested {" + key + " = " + result + ", " + formID + "}" );
			} 
			return result;
		},

		// Deal With Various Conditions
		prepareValidations: function(form,data){
			var formID = form.attr('id');
			this.log("validations","preparing validation data");
			// Setup Form Conditions with remote Validation JSON Rules
			for (var key in data) {
			   if (key == "conditions"){
					var obj = data[key];
					for (var condition in obj){
						var clientTest = obj[condition];
						if (!$.validatethis.conditions[formID]){
							$.validatethis.conditions[formID] = {};
						}
						$.validatethis.conditions[formID][condition] = clientTest;
					}
			   }
			}

			// Set this element's data "depends" key and rule.
			for (var key in data) {
			 	if (key == "rules"){
					var obj = data[key];
					for (var property in obj){
						var rules = obj[property];
						$(rules).each(function(){
							for (var item in this){
								if (this[item].depends){
									var key = this[item].depends;
									$(":input[name='" + property + "']",form).data("depends",key);
									this[item].depends = function (element) { return $.validatethis.testCondition(element) };
								}
							}
						});
					}
				}
			}
			return data;
		},

		// Setup validate for a form using the remote getValidationRulesStruct() results (JSON) 
		loadRules: function(form,data){
			$.validatethis.log("loadRules",form.attr('name'));

			var validations = this.prepareValidations(form,$.parseJSON(data));
			//var cacheItem = {key: form.attr('id'), value: validations};
			//this.vtCache.push(cacheItem);

			form.validate({
				debug: false,
				ignore: $.validatethis.settings.ignoreClass,
				submitHandler: $.validatethis.submitHandler,
				rules: validations.rules,
				messages: validations.messages
			});
			$.validatethis.log("validations","ready");
		},

		// Setup validate plugin methods for a page using the remote getInitializationScript(setup="methods") results plain/text javascript 
		evalInitScript : function(data){
			var dataEl = $(data);
			eval(dataEl.html());
		},

		getVersionCallback: function(data){
			$.validatethis.settings.remoteEnabled = true;
			$.validatethis.log("plugin","v" + data);
		},

		log: function(type, message){
			if (this.settings.debug && window.console) {
				if (console.debug){
					console.debug("ValidateThis " + "[" + type + "]: " + message);
				} else if (console.log){
					console.log(message);
				}
			}
			else {
				// log to some other mechanism here (alert? ajax? ui?)
				// alert(message);
			};
		}
	};

	// ValidateThis Plugin Method
	$.fn.validatethis = function(options){	
		
		// extend opt settings with options argument
		var opts = $.extend({}, $.validatethis.settings, options);
		
		// each selected element
		return this.each(function(){
			
			// extends init option with metadata or extends opts with element data
			var o = $.meta ? $.extend({}, opts, $this.data()) : opts;
				
				$.validatethis.init(o);
					
				// Initialize Validate Plugin
				$(this).find("form").each(function(){
					var $form = $(this);
					
					$.validatethis.log("form",$form.attr('name'));
					
					$.validatethis.remoteCall("getValidationJSON",{"objectType":$form.attr('rel'),"formName":$form.attr('id'),"locale":"","context":$form.attr('id')},
						function(data){
							$.validatethis.loadRules($form,data);
							//$form.data('setup',true);
						}
					);
					
				});
		});
	};

// end of closure
})(jQuery);