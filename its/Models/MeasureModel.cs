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
