'use strict';

import React from 'react';
import {PermissionsAndroid, Text, TouchableOpacity, StyleSheet, View} from 'react-native';
import {PDFDocument, StandardFonts} from 'pdf-lib';
import QRCode from 'qrcode';
import RNFS from 'react-native-fs';


// Custom button
// See https://blog.logrocket.com/creating-custom-buttons-in-react-native/
const AppButton = ({onPress, title}) => (
    <TouchableOpacity onPress={onPress} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>{title}</Text>
    </TouchableOpacity>
);

// Entry point
export default function App() {
    // NOTE: seems that this function cannot be 'async'

    // Request Android permissions
    requestPermissions().then(r => console.log('Permission requested. Details:', r === undefined ? 'None' : e));

    // Generate a certificate
    const reasons = [possibleReasons.leisure, possibleReasons.shopping, possibleReasons.work];
    generate(reasons).then();

    return (
        <View style={styles.container}>
            <AppButton onPress={onShoppingClicked} title='Courses'/>
            <AppButton onPress={onLeisureClicked} title='Promenade'/>
            <AppButton onPress={onWorkClicked} title='Travail'/>
        </View>
    );
}

// Request permissions to write to storage
async function requestPermissions() {
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Permissions granted');
    } else {
        console.error('Permissions NOT GRANTED');
    }

    //await tryFS();
}

async function tryFS() {

    console.error('Try FS locations | start');

    // console.log('MainBundlePath = ', RNFS.MainBundlePath); // Not available on Android
    console.log('CachesDirectoryPath = ', RNFS.CachesDirectoryPath);
    console.log('ExternalCachesDirectoryPath = ', RNFS.ExternalCachesDirectoryPath);
    console.log('DocumentDirectoryPath = ', RNFS.DocumentDirectoryPath);
    console.log('DownloadDirectoryPath = ', RNFS.DownloadDirectoryPath);
    console.log('TemporaryDirectoryPath = ', RNFS.TemporaryDirectoryPath);
    console.log('LibraryDirectoryPath = ', RNFS.LibraryDirectoryPath);
    console.log('ExternalDirectoryPath = ', RNFS.ExternalDirectoryPath);
    console.log('ExternalStorageDirectoryPath = ', RNFS.ExternalStorageDirectoryPath);

    // const filepath = RNFS.ExternalDirectoryPath  + '/' + 'test.txt'; // OK
    const filepath = RNFS.DownloadDirectoryPath + '/' + 'test.txt';
    // FIXME if permissions have be granted, shouldn't we be able to write there?

    console.log(filepath);
    await RNFS.writeFile(filepath, 'Lorem ipsum dolor sit amet', 'utf8')
        .then((success) => {
            console.log('FILE WRITTEN!');
        })
        .catch((err) => {
            console.log(err.message);
        });

    console.error('Try FS locations | end');
}

// Callbacks for buttons
async function onWorkClicked() {
    await generate([possibleReasons.work]);
}

async function onLeisureClicked() {
    await generate([possibleReasons.leisure]);
}

async function onShoppingClicked() {
    await generate([possibleReasons.shopping]);
}

// Data to generate the certificate
const personalInformation = {
    lastname: 'John',
    firstname: 'Doe',
    birthday: '08/08/1987',
    placeofbirth: 'FarAwayTown',
    address: '42 victory street',
    zipcode: '42666',
    town: 'LivingTown',
};

const currentCity = 'Nantes';

const possibleReasons = {
    work: 'travail',
    shopping: 'achats',
    leisure: 'sport_animaux',
};

const yReasons = {
    travail: 578,
    achats: 533,
    sante: 477,
    famille: 435,
    handicap: 396,
    sport_animaux: 358,
    convocation: 295,
    missions: 255,
    enfants: 211,
};

// Download the certificate template from government's website if not done yet
async function loadPdfTemplateAndroid() {

    console.log('Load PDF template on Android');

    const filename = `${RNFS.ExternalDirectoryPath}/certificate_template.pdf`;

    // Get template from government's website
    if (await RNFS.exists(filename)) {
        console.log('Template already downloaded');
    } else {
        console.log('Download template');

        await RNFS.downloadFile({
            fromUrl: 'https://github.com/LAB-MI/attestation-deplacement-derogatoire-q4-2020/raw/main/src/certificate.pdf',
            toFile: filename,
        }).promise.then((r) => {
            console.log('Download finished');
        });
    }

    // Load it
    const file = await RNFS.readFile(filename, 'base64');
    const pdfDoc = await PDFDocument.load(file);

    console.log('PDF template loaded:', pdfDoc.getTitle());
    return pdfDoc;
}

// Generate the certificate
async function generate(reasons) {
    try {
        // Get timestamp
        const now = new Date();
        const nowIso = now.toISOString(); // something like '2011-10-05T14:48:00.000Z'

        const timestamp = {
            date: now.toLocaleDateString('fr-FR'),
            time: now
                .toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
                .replace(':', 'h'),
            forFilename: nowIso
                .replace('T', '_')
                .replace(RegExp(':', 'g'), '-')
                .substring(0, nowIso.length - 5),
        };

        console.log(timestamp);

        // Load PDF
        const pdfDoc = await loadPdfTemplateAndroid();

        // Metadata
        pdfDoc.setTitle('COVID-19 - Déclaration de déplacement');
        pdfDoc.setSubject('Attestation de déplacement dérogatoire');
        pdfDoc.setKeywords([
            'covid19',
            'covid-19',
            'attestation',
            'déclaration',
            'déplacement',
            'officielle',
            'gouvernement',
        ]);
        pdfDoc.setProducer('DNUM/SDIT');
        pdfDoc.setCreator('');
        pdfDoc.setAuthor('Ministère de l\'intérieur');

        // Add personal information
        const page1 = pdfDoc.getPages()[0];

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const drawText = (text, x, y, size = 11) => {
            page1.drawText(text, {x, y, size, font});
        };

        drawText(`${personalInformation.firstname} ${personalInformation.lastname}`, 119, 696);
        drawText(personalInformation.birthday, 119, 674);
        drawText(personalInformation.placeofbirth, 297, 674);
        drawText(`${personalInformation.address} ${personalInformation.zipcode} ${personalInformation.city}`, 133, 652);

        // Reason(s) to be out
        reasons.forEach(reason => {
            drawText('x', 78, yReasons[reason], 18);
        });

        // City & timestamp
        drawText(currentCity, 105, 177, 11);
        drawText(`${timestamp.date}`, 91, 153, 11);
        drawText(`${timestamp.time}`, 264, 153, 11);

        // Generate QR code
        const text = [
            `Cree le: ${timestamp.date} a ${timestamp.time}`,
            `Nom: ${personalInformation.lastname}`,
            `Prenom: ${personalInformation.firstname}`,
            `Naissance: ${personalInformation.birthday} a ${personalInformation.placeofbirth}`,
            `Adresse: ${personalInformation.address} ${personalInformation.zipcode} ${personalInformation.town}`,
            `Sortie: ${timestamp.date} a ${timestamp.time}`,
            `Motifs: ${reasons.join(', ')}`,
        ].join(';\n ');

        const opts = {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
        };

        // const generatedCode = await QRCode.toDataURL(text, opts); // OK Expo web, KO android
        const generatedCode = QRCode.create(text, opts); // OK Android
        // FIXME cannot generate the QR code
        // Exception = [Error: You need to specify a canvas element]
        // See https://github.com/soldair/node-qrcode/issues/175

        // Add it to PDF
        // const image = await pdfDoc.embedPng([987, 78, 54, 546, 1]); // OK Expo web, KO android
        // FIXME cannot generate image from QR code

        // This code commented out because we can't generate the image
        // page1.drawImage(image, {
        //     x: page1.getWidth() - 156,
        //     y: 100,
        //     width: 92,
        //     height: 92,
        // });
        //
        // pdfDoc.addPage();
        // const page2 = pdfDoc.getPages()[1];
        //
        // page2.drawImage(image, {
        //     x: 50,
        //     y: page2.getHeight() - 350,
        //     width: 300,
        //     height: 300,
        // });

        // Save PDF to file
        console.warn('Saving', fileName);

        const fileName = `attestation-${timestamp.forFilename}.pdf`;
        const filePath = RNFS.ExternalDirectoryPath + '/' + fileName;

        const pdfBytes = await pdfDoc.save();
        // const written = await RNFS.writeFile(path, pdfBytes.toString())

        await RNFS.writeFile(filePath, pdfBytes, 'ascii')
            .then((success) => {
                console.log('FILE WRITTEN!');
            })
            .catch((err) => {
                console.log('CANNOT WRITE FILE:', err.message);
            });
        // FIXME file is generated but it is not a valid PDF apparently
        // Writing 'pdfBytes.toString()' instead of just 'pdfBytes' makes no difference (seems that files sizes are the same)

        console.error('*** Certificate has been generated -->', filePath, '***');

    } catch (e) {
        console.error('EXCEPTION CAUGHT /!\\', e);
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appButtonContainer: {
        elevation: 8,
        backgroundColor: '#009688',
        borderRadius: 2,
        paddingVertical: 10,
        paddingHorizontal: 12,
        margin: 15,
        width: '80%',
    },
    appButtonText: {
        fontSize: 25,
        color: '#fff',
        fontWeight: 'bold',
        alignSelf: 'center',
        textTransform: 'uppercase',
        padding: 10,
    },
});
