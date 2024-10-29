/*
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
using System.Collections.Generic;
using System.Text;

namespace AzureDevOpsExtension.IntegrationTests.Models
{
    public class Measure
    {
        public string metric { get; set; }
        public string value { get; set; }
        public List<Period> periods { get; set; }
    }

    public class Component
    {
        public string key { get; set; }
        public string name { get; set; }
        public string qualifier { get; set; }
        public string language { get; set; }
        public string path { get; set; }
        public List<Measure> measures { get; set; }
    }

    public class Metric
    {
        public string key { get; set; }
        public string name { get; set; }
        public string description { get; set; }
        public string domain { get; set; }
        public string type { get; set; }
        public bool higherValuesAreBetter { get; set; }
        public bool qualitative { get; set; }
        public bool hidden { get; set; }
        public bool custom { get; set; }
    }

    public class Period
    {
        public int index { get; set; }
        public string mode { get; set; }
        public DateTime? date { get; set; }
        public string parameter { get; set; }

        public string value { get; set; }
    }

    public class MeasureBaseModel
    {
        public Component component { get; set; }
        public List<Metric> metrics { get; set; }
        public List<Period> periods { get; set; }
    }
}
