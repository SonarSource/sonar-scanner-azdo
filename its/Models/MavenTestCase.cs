﻿/*
 * Azure DevOps extension for SonarQube/SonarCloud ITs
 * Copyright (C) 2016-2022 SonarSource SA
 * mailto: info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

using System;
namespace IntegrationTests.Models
{
	public class MavenTestCase : BuildTestCase
	{
		public MavenTestCase()
		{
			base.Coverage = Double.Parse(EnvironmentVariableWrapper.GetVariableOrThrow("ITS_MAVEN_EXPECTED_COVERAGE"));
			base.NcLocs = Int64.Parse(EnvironmentVariableWrapper.GetVariableOrThrow("ITS_MAVEN_EXPECTED_NCLOCS"));
			base.PipelineName = EnvironmentVariableWrapper.GetVariableOrThrow("ITS_MAVEN_PIPELINE_NAME");
			base.ProjectKey = EnvironmentVariableWrapper.GetVariableOrThrow("ITS_MAVEN_SC_PROJECT_KEY");
			base.LogPrefix = "Maven";
		}
	}
}

