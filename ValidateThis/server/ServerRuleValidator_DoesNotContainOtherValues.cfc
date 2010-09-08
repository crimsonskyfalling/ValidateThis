<!--- 
UniqueValue:
	ServerRuleValidator Implmenetation By Marc Esher:
	ClientRuleScripter Implementation By Adam Drew

Definition Usage Example:

<rule type="UniqueValue" failuremessage="Password may not contain your first or last name." >
	<param propertyNames="firstName,LastName"/>
</rule>
<rule type="UniqueValue" failuremessage="Password may not contain your username.">
	<param propertyNames="username" />
</rule>
<rule type="UniqueValue" failuremessage="Password may not contain your email address." >
	<param propertyNames="emailAddress"/>
</rule>
<rule type="UniqueValue" failuremessage="This better be ignored!" >
	<param propertyNames="thisPropertyDoesNotExist"/>
</rule>

See ClientRuleScripter_UniqueValue.cfc for client implmenetation
--->

<cfcomponent extends="AbstractServerRuleValidator" hint="Fails if the validated property contains the value of another property">
	<cfscript>
		function validate(validation){
			var value = arguments.validation.getObjectValue();
			var params = arguments.validation.getParameters();
			var property = "";
			var propValue = "";

			if (not shouldTest(arguments.validation)) return;
			if (not validation.hasParameter("propertyNames")) {
				fail(validation, "Missing Parameters");
				return;
			};

			var propertyNames = listToArray(arguments.validation.getParameterValue("propertyNames"));
			for(property in propertyNames){
				var propValue = arguments.validation.getObjectValue(property);
				if(propValue NEQ "" AND value contains propValue){
					fail(validation, "The #arguments.validation.getPropertyDesc()# must not contain the values of properties named: #params.propertyNames#. ");
				}
			}
		}
	</cfscript>
</cfcomponent>
