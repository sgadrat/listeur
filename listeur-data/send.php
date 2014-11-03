<?php
function error($sStatus) {
	$protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
	header($protocol .' '. $sStatus);
	echo $sStatus;
	exit;
}

$sFilename = $_GET['f'] .'.json';

if (! file_exists($sFilename)) {
	error('404 Not Found');
}

$sData = file_get_contents('php://input');
if (file_put_contents($sFilename, $sData) === FALSE) {
	error('500 Write failed');
}
?>
