<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cmd = 'gphoto2 --capture-image-and-download --filename=/home/rpi/photo/command/pictures/%d-%m-%Y_%H-%M-%S_%f.%C';
    shell_exec("sudo $cmd 2>&1");
    echo "OK"; // renvoie juste OK
    exit;
}
?>