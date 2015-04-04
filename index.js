// A little dc-js magic to analyze the CFPB Consumer Complaints
var data,
    facts,
    companyDim,
    companyResponseDim,
    disputedDim,
    receivedDim,
    sentDim,
    issueDim,
    subIssueDim,
    productDim,
    subProductDim,
    stateDim,
    submitViaDim,
    timelyDim,
    zipcodeDim;


var complaintCountChart,
    companyResponseChart,
    complaintsByProductChart,
    complaintsByIssueChart,
    complaintsByYearChart, complaintsByMonthChart, complaintsByDisputedChart;
    

var monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];

function pad(num, size, char) {
    var s = num+"";
    if (typeof char === 'undefined') { char = "0"; }
    while (s.length < size) s = char + s;
    return s;
}

d3.csv("https://data.consumerfinance.gov/api/views/x94z-ydhh/rows.csv?accessType=DOWNLOAD", function(result) {
    data = result;
    LoadDimensions();
    LoadCharts();
})

var filterToggle = true;

function reset() {
    autoScale = false;
    filterToggle = true;
    d3.selectAll('input[type="checkbox"]'). property("checked", false);
    companyDim.filter();
    dc.filterAll();
    turnAutoScale(true);
    dc.renderAll();
    
    turnAutoScale(false);
}

// Only show loans belonging to PennyMac
function filterPNMAC() {
    if (filterToggle) {
	companyDim.filter('PennyMac Loan Services, LLC');
    } else {
	companyDim.filter();
    }
    filterToggle = !filterToggle;
    dc.redrawAll();
}

// Add a toggle to auto scale Y axis on line chart
var autoScale = false;
function toggleAutoScale() {
    autoScale = !autoScale;
    turnAutoScale(autoScale);
}
function turnAutoScale(autoScale) {

    complaintCountChart.elasticY(autoScale);
    complaintCountChart.redraw();

    complaintsByMonthChart.elasticY(autoScale);
    complaintsByMonthChart.redraw();
    
    complaintsByProductChart.elasticX(autoScale);
    complaintsByProductChart.redraw();

    complaintsByIssueChart.elasticX(autoScale);
    complaintsByIssueChart.redraw();

    companyResponseChart.elasticX(autoScale);
    companyResponseChart.redraw();
    
}


// Initialize the dimensions used for filtering the complaints
function LoadDimensions() {

    // Pre-process the 
    data.forEach(function(row) {
	row.received = new Date(row["Date received"]);
	row.sent = new Date(row["Date sent to company"]);
	row.daysToSend = Math.round( (row.sent - row.received) / 86400000); // convert milliseconds to days
    });
    
    facts = crossfilter(data);
   
    
    companyDim = facts.dimension(dc.pluck('Company'));
    companyResponseDim = facts.dimension(dc.pluck('Company response'));
    disputedDim = facts.dimension(dc.pluck("Consumer disputed?"));

    receivedDim = facts.dimension(dc.pluck("received"));
    
    monthDim = facts.dimension(function (d) {
        return (d.received.getMonth() + 1).toString();
    });

    yearDim = facts.dimension(function (d) {
        return d.received.getFullYear();
    });
    
    daysToSendDim = facts.dimension(dc.pluck("daysToSend"));
    
    issueDim = facts.dimension(dc.pluck("Issue"));
    //subIssueDim = facts.dimension(dc.pluck("Sub-issue"));
    productDim = facts.dimension(dc.pluck("Product"));
    //subProductDim = facts.dimension(dc.pluck("Sub-product"));
    stateDim = facts.dimension(dc.pluck("State"));
    submitViaDim = facts.dimension(dc.pluck("Submitted via"));
    timelyDim = facts.dimension(dc.pluck("Timely response?"));
    //zipcodeDim = facts.dimension(dc.pluck("ZIP code"));

    return facts;
}


// load the charts into some spiffy looking charts
function LoadCharts() {

    /* Charts
       ==========================================
       1. Line chart of complaint count by received  (Main chart)
       2. GEO Choropleth with complaint count
       3. Pie chart of timely response?
       4. Bar chart of days to send complaint to company
       5. Row chart of complaint count by product
       6. Top complaints by company
       7. Top complaints by state
       8. Top complaints by issue
       9. Filtered/Total Counts
    */

    var recieveGroup = receivedDim.group();
    var minDate = receivedDim.bottom(1)[0].received;
    var maxDate = receivedDim.top(1)[0].received;

    complaintCountChart = dc.barChart("#line-chart-count-by-received")
	.dimension(receivedDim)
	.group(recieveGroup)
	.yAxisLabel("Number of complaints")
	.x(d3.time.scale().domain([minDate,maxDate]))
	.elasticY(autoScale)
	.width(768)
	.height(350);

    var companyResponseGroup = companyResponseDim.group();

    companyResponseChart = dc.rowChart("#pie-chart-company-response")
	.dimension(companyResponseDim)
	.group(companyResponseGroup)
    	.elasticX(autoScale)
	.width(440)
	.height(350);
    
    var productGroup = productDim.group();
    
    complaintsByProductChart = dc.rowChart('#row-chart-count-by-product')
	.dimension(productDim)
	.group(productGroup)
	.width(340)
	.height(350 * 3)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(30);
	})
	.ordering(function(d) { return -d.value });

    var issueGroup = issueDim.group();
    
    complaintsByIssueChart = dc.rowChart('#row-chart-count-by-issue')
	.dimension(issueDim)
	.group(issueGroup)
	.width(400)
	.height(350 * 3)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(30);
	})
	.ordering(function(d) { return -d.value });

    var companyGroup = companyDim.group();
    
    complaintsByIssueChart = dc.rowChart('#row-chart-count-by-company')
	.dimension(companyDim)
	.group(companyGroup)
	.width(400)
	.height(350 * 3)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(30);
	})
	.ordering(function(d) { return -d.value });
    
    

    var yearGroup = yearDim.group();

    complaintsByYearChart = dc.pieChart('#pie-chart-by-year')
	.dimension(yearDim)
	.group(yearGroup)
	.width(250)
	.height(200);

    var monthGroup = monthDim.group();

    complaintsByMonthChart = dc.barChart('#pie-chart-by-month')
	.dimension(monthDim)
	.group(monthGroup)
	.elasticY(autoScale)
	.x(d3.scale.linear().domain([1,12]))
	.width(550)
	.height(200);

    var disputedGroup = disputedDim.group();

    complaintsByDisputedChart = dc.pieChart('#pie-chart-by-disputed')
	.dimension(disputedDim)
	.group(disputedGroup)
	.width(250)
	.height(200);

    dc.renderAll();
    
    
    
}
