'use strict';

import React from 'react';
import {Text, TouchableOpacity, StyleSheet, View} from 'react-native';
import {PDFDocument, StandardFonts} from 'pdf-lib';
import QRCode from 'qrcode';

import pdfTemplate from './certificate_template.pdf'

// Custom button
// See https://blog.logrocket.com/creating-custom-buttons-in-react-native/
const AppButton = ({onPress, title}) => (
    <TouchableOpacity onPress={onPress} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>{title}</Text>
    </TouchableOpacity>
);

// Entry point
export default function App() {
    // const reasons = [possibleReasons.leisure, possibleReasons.shopping, possibleReasons.work];
    // generate(reasons).then();

    return (
        <View style={styles.container}>
            <AppButton onPress={onShoppingClicked} title='Courses'/>
            <AppButton onPress={onLeisureClicked} title='Promenade'/>
            <AppButton onPress={onWorkClicked} title='Travail'/>
        </View>
    );
}

async function onWorkClicked() {
    await generate([possibleReasons.work])
}

async function onLeisureClicked() {
    await generate([possibleReasons.leisure])
}

async function onShoppingClicked() {
    await generate([possibleReasons.shopping])
}

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
    leisure: 'sport_animaux'
}

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
}

async function generate(reasons) {

    // Get timestamp
    const now = new Date();
    const nowIso = now.toISOString(); // something like "2011-10-05T14:48:00.000Z"

    const timestamp = {
        date: now.toLocaleDateString('fr-FR'),
        time: now
            .toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
            .replace(':', 'h'),
        forFilename: nowIso
            .replace('T', '_')
            .replaceAll(':', '-')
            .substring(0, nowIso.length - 5)
    }

    console.log(timestamp)

    // Load PDF
    const pdfTemplateBytes = await fetch(pdfTemplate).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfTemplateBytes);

    // Metadata
    pdfDoc.setTitle('COVID-19 - Déclaration de déplacement')
    pdfDoc.setSubject('Attestation de déplacement dérogatoire')
    pdfDoc.setKeywords([
        'covid19',
        'covid-19',
        'attestation',
        'déclaration',
        'déplacement',
        'officielle',
        'gouvernement',
    ])
    pdfDoc.setProducer('DNUM/SDIT')
    pdfDoc.setCreator('')
    pdfDoc.setAuthor("Ministère de l'intérieur")

    // Add personal information
    const page1 = pdfDoc.getPages()[0]

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const drawText = (text, x, y, size = 11) => {
        page1.drawText(text, {x, y, size, font})
    }

    drawText(`${personalInformation.firstname} ${personalInformation.lastname}`, 119, 696)
    drawText(personalInformation.birthday, 119, 674)
    drawText(personalInformation.placeofbirth, 297, 674)
    drawText(`${personalInformation.address} ${personalInformation.zipcode} ${personalInformation.town}`, 133, 652)

    // Reason(s) to be out
    reasons.forEach(reason => {
        drawText('x', 78, yReasons[reason], 18)
    })

    // City & timestamp
    drawText(currentCity, 105, 177, 11);
    drawText(`${timestamp.date}`, 91, 153, 11);
    drawText(`${timestamp.time}`, 264, 153, 11);

    // QR code
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

    const generatedCode = await QRCode.toDataURL(text, opts);
    console.log(generatedCode);
    const image = await pdfDoc.embedPng(generatedCode);

    page1.drawImage(image, {
        x: page1.getWidth() - 156,
        y: 100,
        width: 92,
        height: 92,
    })

    pdfDoc.addPage()
    const page2 = pdfDoc.getPages()[1]
    page2.drawImage(image, {
        x: 50,
        y: page2.getHeight() - 350,
        width: 300,
        height: 300,
    })

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], {type: 'application/pdf'});
    console.log(pdfBlob);

    // Download
    const fileName = `attestation-${timestamp.forFilename}.pdf`
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
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
        backgroundColor: "#009688",
        borderRadius: 2,
        paddingVertical: 10,
        paddingHorizontal: 12,
        margin: 15,
        width: '80%',
    },
    appButtonText: {
        fontSize: 25,
        color: "#fff",
        fontWeight: "bold",
        alignSelf: "center",
        textTransform: "uppercase",
        padding: 10,
    }
});
