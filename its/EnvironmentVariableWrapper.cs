using System;
namespace IntegrationTests
{
	public static class EnvironmentVariableWrapper
	{
		public static string GetVariableOrThrow(string environmentVariableName)
        {
			var value = Environment.GetEnvironmentVariable(environmentVariableName);
			return String.IsNullOrEmpty(value)
				? throw new Exception($"Environment variable {environmentVariableName} was not found or is empty.s") : value;

		}
	}
}

